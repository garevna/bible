<template>
  <AppDialog v-model="open" :title="group ? groupTitle(group) : ''" icon="mdi-home-group" max-width="680">
    <template v-if="group && canEdit && !editing" #header>
      <v-btn variant="text" color="secondary" class="text-none" prepend-icon="$editNote" @click="startEdit">
        {{ text.edit }}
      </v-btn>
    </template>

    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>

    <!-- the group as everyone who may see it sees it -->
    <div v-if="group && !editing" class="facts">
      <p>
        <v-icon icon="mdi-clock-outline" size="small" />
        {{ text.meets }}: {{ meetsText(group) }}
      </p>
      <p v-if="group.address">
        <v-icon icon="mdi-map-marker-outline" size="small" />
        <a :href="mapUrl(group)" target="_blank" rel="noopener" :title="text.openMap">{{ group.address }}</a>
      </p>
      <p>
        <v-icon icon="mdi-account-star-outline" size="small" />
        {{ text.leader }}: {{ group.leaderName }}
      </p>
      <p v-if="group.description" class="description">{{ group.description }}</p>

      <h4 class="label">{{ format(text.membersCount, { count: group.members.length }) }}</h4>
      <ul class="members">
        <li v-for="member of group.members" :key="member.id">
          <span class="member-name">{{ member.name }}</span>
          <span v-if="member.birthday" class="muted"> · {{ birthdayText(member.birthday) }}</span>
          <span v-if="member.note" class="muted"> · {{ member.note }}</span>
        </li>
      </ul>

      <template v-if="group.own && group.meetingNote">
        <h4 class="label">{{ text.meetingNote }}</h4>
        <p class="description">{{ group.meetingNote }}</p>
      </template>
    </div>

    <!-- the leader keeps the group; the administrators give its name and its leader -->
    <div v-else-if="group && editing" class="form">
      <template v-if="groups.manage">
        <v-text-field v-model="draft.name" :label="text.groupNameOptional" density="compact" hide-details />
        <LeaderField v-model="leader" density="compact" />
      </template>

      <div class="d-flex flex-wrap ga-2">
        <v-select
          v-model="draft.weekday"
          :items="weekdayItems"
          :label="text.weekday"
          density="compact"
          hide-details
          clearable
          class="field"
        />
        <TimeField v-model="draft.time" :label="text.time" density="compact" hide-details class="field" />
      </div>

      <div class="d-flex align-center ga-2">
        <v-text-field v-model="draft.address" :label="text.address" density="compact" hide-details />
        <v-btn
          variant="tonal"
          color="buttons"
          class="text-none"
          prepend-icon="mdi-map-search-outline"
          @click="picker = true"
        >
          {{ text.chooseOnMap }}
        </v-btn>
      </div>

      <v-textarea
        v-model="draft.description"
        :label="text.description"
        rows="2"
        auto-grow
        density="compact"
        hide-details
      />

      <!-- the members: the birthdays and the notes are the leader's -->
      <template v-if="group.own">
        <h4 class="label">{{ text.members }}</h4>
        <p class="muted">{{ text.privateHint }}</p>
        <div v-for="member of draft.members" :key="member.id" class="member">
          <v-text-field
            v-model="member.name"
            :label="text.memberName"
            density="compact"
            hide-details
            class="field"
          />
          <DateField
            v-model="member.birthday"
            :label="text.birthday"
            pick-year
            clearable
            density="compact"
            hide-details
            class="field field--date"
          />
          <v-text-field
            v-model="member.note"
            :label="text.memberNote"
            density="compact"
            hide-details
            class="field field--wide"
          />
          <ButtonTooltip
            icon="$unlink"
            :text="text.removeMember"
            color="delete"
            @click="removeMember(member.id)"
          />
        </div>
        <v-text-field
          v-model="newMember"
          :label="text.newMember"
          append-inner-icon="mdi-plus-thick"
          density="compact"
          hide-details
          class="new-member"
          @click:append-inner="addMember"
          @keydown.enter="addMember"
        />

        <v-textarea
          v-model="draft.meetingNote"
          :label="text.meetingNote"
          rows="3"
          auto-grow
          density="compact"
          hide-details
        />
      </template>

      <div v-if="groups.manage" class="d-flex justify-end">
        <ConfirmButton
          icon="$unlink"
          :text="`${text.removeGroup}: ${groupTitle(group)}`"
          @confirm="removeGroup"
        />
      </div>
    </div>

    <template v-if="editing" #actions>
      <DialogButtons :confirm-text="common.save" :disabled="busy" @cancel="editing = false" @confirm="save" />
    </template>

    <PlacePicker
      v-if="group"
      v-model="picker"
      :location="groupTitle(group)"
      :place="draft.address ? { address: draft.address, lat: draft.lat, lng: draft.lng } : null"
      @picked="picked"
    />
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import ConfirmButton from '@/components/ConfirmButton.vue'
import DateField from '@/components/DateField.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import PlacePicker from '@/components/admin/PlacePicker.vue'
import LeaderField from '@/components/groups/LeaderField.vue'
import TimeField from '@/components/TimeField.vue'
import {
  groupTitle,
  useGroupsStore,
  type GroupChange,
  type GroupMember,
  type HomeGroup
} from '@/stores/groups'
import { useLanguageStore } from '@/stores/language'
import { mapUrl, useScheduleStore, type Place } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { WorkerError } from '@/stores/worker'
import { localeOf } from '@/utils/dates'
import { format } from '@/utils/format'

/**
 * A home group: when and where it meets, its leader and its members. Its leader (and a supervisor)
 * changes it and sees the birthdays and the notes; the administrators give its name and its leader.
 */
const open = defineModel<boolean>({ default: false })
const props = defineProps<{ groupId: string | null }>()

const groups = useGroupsStore()
const schedule = useScheduleStore()
const user = useUserStore()
const { groups: text, common, publish } = storeToRefs(useLanguageStore())

const group = computed(() => groups.groups.find((item) => item.id === props.groupId) ?? null)
const canEdit = computed(() => Boolean(group.value && (group.value.own || groups.manage)))
const locale = computed(() => localeOf(user.lang))

const editing = ref(false)
const busy = ref(false)
const error = ref('')
const picker = ref(false)
const newMember = ref('')
/** the leader as the administrators change it */
const leader = ref({ leaderUid: '', leaderName: '' })

const draft = reactive({
  name: '',
  leaderUid: '',
  weekday: null as number | null,
  time: '',
  address: '',
  lat: undefined as number | undefined,
  lng: undefined as number | undefined,
  description: '',
  members: [] as GroupMember[],
  meetingNote: ''
})

watch(open, (value) => {
  editing.value = false
  error.value = ''
  if (!value) picker.value = false
})

/** 0 Sunday … 6 Saturday, Monday first */
const weekdayName = (day: number, style: 'long' | 'short' = 'long') =>
  // 2024-01-07 was a Sunday
  new Intl.DateTimeFormat(locale.value, { weekday: style }).format(new Date(2024, 0, 7 + day))
const weekdayItems = computed(() =>
  [1, 2, 3, 4, 5, 6, 0].map((day) => ({ value: day, title: weekdayName(day) }))
)

const meetsText = (item: HomeGroup) =>
  item.weekday === null
    ? text.value.notSet
    : `${weekdayName(item.weekday)}${item.time ? `, ${item.time}` : ''}`

/** "8 березня" (and the year when it is known) */
const birthdayText = (birthday: string) => {
  const date = new Date(`${birthday.replace(/^--/, '2000-')}T12:00:00`)
  return new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'long',
    ...(birthday.startsWith('--') ? {} : { year: 'numeric' })
  }).format(date)
}

function startEdit() {
  const item = group.value!
  Object.assign(draft, {
    name: item.name,
    leaderUid: item.leaderUid,
    weekday: item.weekday,
    time: item.time,
    address: item.address,
    lat: item.lat,
    lng: item.lng,
    description: item.description,
    members: item.members.map((member) => ({ ...member })),
    meetingNote: item.meetingNote
  })
  leader.value = { leaderUid: item.leaderUid, leaderName: item.leaderName }
  editing.value = true
  if (groups.manage) schedule.loadChoices().catch(() => undefined)
}

function picked(place: Place) {
  draft.address = place.address
  draft.lat = place.lat
  draft.lng = place.lng
  picker.value = false
}

function addMember() {
  const name = (newMember.value ?? '').trim()
  if (!name) return
  draft.members.push({ id: `m-${Date.now().toString(36)}`, name, birthday: null, note: '' })
  newMember.value = ''
}

const removeMember = (id: string) => (draft.members = draft.members.filter((member) => member.id !== id))

const reason = (cause: unknown) =>
  cause instanceof WorkerError && cause.message !== 'unreachable' ? cause.message : publish.value.unreachable

async function save() {
  const item = group.value!
  const change: GroupChange = {
    weekday: draft.weekday,
    time: draft.time ?? '',
    address: (draft.address ?? '').trim(),
    description: (draft.description ?? '').trim(),
    ...(draft.lat !== undefined && draft.lng !== undefined
      ? { lat: draft.lat, lng: draft.lng }
      : { lat: null, lng: null })
  }
  if (item.own) {
    change.members = draft.members
      .filter((member) => member.name.trim())
      .map((member) => ({ ...member, name: member.name.trim(), birthday: member.birthday || null }))
    change.meetingNote = (draft.meetingNote ?? '').trim()
  }
  if (groups.manage) {
    if ((draft.name ?? '').trim() !== item.name) change.name = (draft.name ?? '').trim()
    const { leaderUid, leaderName } = leader.value
    if (leaderUid ? leaderUid !== item.leaderUid : leaderName && leaderName !== item.leaderName)
      Object.assign(change, { leaderUid, leaderName })
  }
  busy.value = true
  error.value = ''
  try {
    await groups.update(item.id, change)
    editing.value = false
  } catch (cause) {
    error.value = reason(cause)
  } finally {
    busy.value = false
  }
}

async function removeGroup() {
  try {
    await groups.remove(group.value!.id)
    open.value = false
  } catch (cause) {
    error.value = reason(cause)
  }
}
</script>

<style scoped>
.facts p {
  margin-bottom: 6px;
}

.description {
  white-space: pre-line;
}

.label {
  font-weight: 600;
  margin: 12px 0 4px;
}

.members {
  padding-left: 20px;
}

.member-name {
  font-weight: 500;
}

.muted {
  color: var(--app-text-muted);
  font-size: 13px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.member {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.field {
  flex: 1 1 140px;
}

.field--date {
  flex: 0 0 200px;
}

.field--wide {
  flex: 2 1 220px;
}

.new-member {
  max-width: 420px;
}
</style>
