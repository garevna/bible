<template>
  <div class="page mx-auto groups-page" style="max-width: 900px">
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="compact"
      closable
      class="mb-4"
      @click:close="error = ''"
    >
      {{ error }}
    </v-alert>

    <!-- the administrators: a new group with its leader, and who sees the groups -->
    <div v-if="groups.manage" class="manage d-flex flex-wrap align-center ga-2 mb-4">
      <v-text-field v-model="newName" :label="text.groupName" density="compact" hide-details class="field" />
      <v-autocomplete
        v-model="newLeader"
        :items="schedule.people"
        item-title="name"
        item-value="uid"
        :label="text.leader"
        density="compact"
        hide-details
        class="field"
        append-icon="mdi-plus-thick"
        @click:append="create"
      />
      <v-spacer />
      <v-select
        :model-value="groups.visibility"
        :items="visibilityItems"
        :label="text.visibility"
        density="compact"
        hide-details
        class="field"
        @update:model-value="setVisibility"
      />
    </div>

    <v-tabs v-model="tab" grow class="mb-3" color="secondary">
      <v-tab value="map" prepend-icon="mdi-map-outline">{{ text.tabMap }}</v-tab>
      <v-tab value="calendar" prepend-icon="mdi-calendar-month-outline">{{ text.tabCalendar }}</v-tab>
      <v-tab value="list" prepend-icon="mdi-format-list-bulleted">{{ text.tabList }}</v-tab>
    </v-tabs>

    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />
    <p v-else-if="groups.loaded && !groups.groups.length" class="muted">{{ text.none }}</p>

    <GroupsMap v-if="tab === 'map' && groups.loaded" @open="openGroup" />

    <template v-else-if="tab === 'calendar'">
      <GroupsMonth v-model:month="month" v-model:selected="day" />
      <!-- the groups of the chosen day: the place and the leader; a click opens the group -->
      <div v-if="day" class="day-list mt-4">
        <h3 class="day-title">{{ dayTitle }}</h3>
        <p v-if="!groups.meetingOn(day).length" class="muted">{{ text.noneOnDay }}</p>
        <GroupRow v-for="group of groups.meetingOn(day)" :key="group.id" :group="group" @open="openGroup" />
      </div>
    </template>

    <template v-else-if="tab === 'list'">
      <GroupRow v-for="group of sorted" :key="group.id" :group="group" with-day @open="openGroup" />
    </template>

    <GroupDialog v-model="dialog" :group-id="openedId" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'

import GroupDialog from '@/components/groups/GroupDialog.vue'
import GroupRow from '@/components/groups/GroupRow.vue'
import GroupsMap from '@/components/groups/GroupsMap.vue'
import GroupsMonth from '@/components/groups/GroupsMonth.vue'
import { useGroupsStore, type GroupsVisibility, type HomeGroup } from '@/stores/groups'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { WorkerError } from '@/stores/worker'
import { localeOf, toISODateString } from '@/utils/dates'

/**
 * The home groups: on the map, in a calendar (how many meet each day) and as a list; a group opens
 * its card. The administrators create the groups and give their leaders here.
 */
const groups = useGroupsStore()
const schedule = useScheduleStore()
const user = useUserStore()
const { groups: text, publish } = storeToRefs(useLanguageStore())

const tab = ref<'map' | 'calendar' | 'list'>('map')
const busy = ref(false)
const error = ref('')
const today = toISODateString(new Date())
const month = ref(today.slice(0, 7))
const day = ref<string | null>(today)

const dialog = ref(false)
const openedId = ref<string | null>(null)
function openGroup(group: HomeGroup) {
  openedId.value = group.id
  dialog.value = true
}

/** "Понеділок, 19 жовтня": the first letter only is a capital */
const dayTitle = computed(() => {
  if (!day.value) return ''
  const name = new Intl.DateTimeFormat(localeOf(user.lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date(`${day.value}T12:00:00`))
  return name.charAt(0).toUpperCase() + name.slice(1)
})

/** by the day of the week, Monday first, then by the time */
const sorted = computed(() =>
  [...groups.groups].sort(
    (a, b) =>
      (((a.weekday ?? 7) + 6) % 7) - (((b.weekday ?? 7) + 6) % 7) ||
      a.time.localeCompare(b.time) ||
      a.name.localeCompare(b.name)
  )
)

const visibilityItems = computed(() => [
  { value: 'servants', title: text.value.visibilityServants },
  { value: 'admins', title: text.value.visibilityAdmins }
])

const reason = (cause: unknown) =>
  cause instanceof WorkerError && cause.message !== 'unreachable' ? cause.message : publish.value.unreachable

async function run(action: () => Promise<unknown>) {
  error.value = ''
  try {
    await action()
  } catch (cause) {
    error.value = reason(cause)
  }
}

onMounted(async () => {
  busy.value = true
  await run(async () => {
    await groups.load()
    if (groups.manage) await schedule.loadChoices()
  })
  busy.value = false
})

const newName = ref('')
const newLeader = ref<string | null>(null)
const create = () =>
  newName.value.trim() &&
  newLeader.value &&
  run(async () => {
    const group = await groups.create(newName.value.trim(), newLeader.value!)
    newName.value = ''
    newLeader.value = null
    openGroup(group)
  })

const setVisibility = (value: GroupsVisibility) => run(() => groups.setVisibility(value))
</script>

<style scoped>
.muted {
  color: var(--app-text-muted);
  font-size: 14px;
}

.field {
  flex: 1 1 200px;
  max-width: 320px;
}

.day-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}
</style>
