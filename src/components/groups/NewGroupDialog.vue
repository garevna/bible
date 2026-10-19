<template>
  <AppDialog v-model="open" :title="text.addGroup" icon="mdi-home-plus-outline" max-width="620">
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>

    <div class="form">
      <LeaderField v-model="leader" density="compact" />
      <div class="d-flex flex-wrap ga-2">
        <v-select
          v-model="weekday"
          :items="weekdayItems"
          :label="text.weekday"
          density="compact"
          hide-details
          class="field"
        />
        <TimeField v-model="time" :label="text.time" density="compact" hide-details class="field" />
      </div>
      <div class="d-flex align-center ga-2">
        <v-text-field v-model="address" :label="text.address" density="compact" hide-details />
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
      <p v-if="point" class="muted">{{ text.pointChosen }}</p>
      <v-text-field v-model="name" :label="text.groupNameOptional" density="compact" hide-details />
    </div>

    <template #actions>
      <DialogButtons
        :confirm-text="common.save"
        :disabled="busy || !ready"
        @cancel="open = false"
        @confirm="save"
      />
    </template>

    <PlacePicker
      v-model="picker"
      :location="leader.leaderName || text.addGroup"
      :place="address ? { address, ...(point ?? {}) } : null"
      @picked="picked"
    />
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import TimeField from '@/components/TimeField.vue'
import PlacePicker from '@/components/admin/PlacePicker.vue'
import LeaderField from '@/components/groups/LeaderField.vue'
import { useGroupsStore, WEEK, weekdayName, type HomeGroup } from '@/stores/groups'
import { useLanguageStore } from '@/stores/language'
import type { Place } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { WorkerError } from '@/stores/worker'
import { localeOf } from '@/utils/dates'

/** A new home group: its leader, the day and the time it meets, its place on the map; a name if wanted */
const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ created: [group: HomeGroup] }>()

const groups = useGroupsStore()
const user = useUserStore()
const { groups: text, common, publish } = storeToRefs(useLanguageStore())

const leader = ref({ leaderUid: '', leaderName: '' })
const weekday = ref<number | null>(null)
const time = ref<string | null>('')
const address = ref('')
const point = ref<{ lat: number; lng: number } | null>(null)
const name = ref('')
const picker = ref(false)
const busy = ref(false)
const error = ref('')

watch(open, (value) => {
  if (!value) return
  leader.value = { leaderUid: '', leaderName: '' }
  weekday.value = null
  time.value = ''
  address.value = ''
  point.value = null
  name.value = ''
  error.value = ''
})

const weekdayItems = computed(() =>
  WEEK.map((day) => ({ value: day, title: weekdayName(day, localeOf(user.lang)) }))
)

/** a leader, a day and a time at least */
const ready = computed(
  () =>
    Boolean(leader.value.leaderUid || leader.value.leaderName) &&
    weekday.value !== null &&
    Boolean(time.value)
)

function picked(place: Place) {
  address.value = place.address
  point.value = place.lat !== undefined && place.lng !== undefined ? { lat: place.lat, lng: place.lng } : null
  picker.value = false
}

async function save() {
  busy.value = true
  error.value = ''
  try {
    const group = await groups.create({
      ...leader.value,
      name: (name.value ?? '').trim(),
      weekday: weekday.value,
      time: time.value ?? '',
      address: (address.value ?? '').trim(),
      ...(point.value ?? {})
    })
    open.value = false
    emit('created', group)
  } catch (cause) {
    error.value =
      cause instanceof WorkerError && cause.message !== 'unreachable'
        ? cause.message
        : publish.value.unreachable
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  flex: 1 1 180px;
}

.muted {
  color: var(--app-text-muted);
  font-size: 13px;
}
</style>
