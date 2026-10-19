<template>
  <div class="search">
    <p class="hint">{{ text.searchHint }}</p>

    <!-- when: the days that suit, and the hours -->
    <p class="label">{{ text.searchDays }}</p>
    <v-chip-group v-model="days" multiple column selected-class="text-secondary">
      <v-chip v-for="day of WEEK" :key="day" :value="day" variant="outlined" filter size="small">
        {{ weekdayName(day, locale, 'short') }}
      </v-chip>
    </v-chip-group>
    <div class="d-flex flex-wrap ga-2 mt-2">
      <TimeField
        v-model="from"
        :label="text.searchFrom"
        density="compact"
        hide-details
        clearable
        class="field"
      />
      <TimeField v-model="to" :label="text.searchTo" density="compact" hide-details clearable class="field" />
    </div>

    <!-- where: an address near the home; the nearest groups first -->
    <v-text-field
      v-model="address"
      :label="text.searchNear"
      :loading="finding"
      append-inner-icon="$search"
      density="compact"
      hide-details
      clearable
      class="mt-3"
      @click:append-inner="find"
      @keydown.enter="find"
      @click:clear="clearPlace"
    />
    <v-list v-if="places.length" density="compact" class="places">
      <v-list-item v-for="item of places" :key="item.key" :title="item.title" @click="choose(item)" />
    </v-list>
    <p v-if="place" class="muted mt-1">{{ format(text.searchFromPlace, { name: place.title }) }}</p>
    <p v-else-if="nothing" class="muted mt-1">{{ admin.nothingFound }}</p>

    <h3 class="label mt-4">{{ format(text.searchFound, { count: found.length }) }}</h3>
    <div v-for="item of found" :key="item.group.id" class="result">
      <GroupRow :group="item.group" with-day @open="emit('open', item.group)" />
      <span v-if="item.km !== null" class="distance">{{ kmText(item.km) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import TimeField from '@/components/TimeField.vue'
import GroupRow from '@/components/groups/GroupRow.vue'
import { useGroupsStore, WEEK, weekdayName, type HomeGroup } from '@/stores/groups'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import { localeOf } from '@/utils/dates'
import { format } from '@/utils/format'
import { distanceKm, findPlaces, type FoundPlace } from '@/utils/geo'

/**
 * A group for a new member of the church: the days and the hours that suit them (the working
 * people meet in the evenings or on the weekend), and the nearest groups to their home first
 */
const emit = defineEmits<{ open: [group: HomeGroup] }>()

const groups = useGroupsStore()
const user = useUserStore()
const { groups: text, admin } = storeToRefs(useLanguageStore())
const locale = computed(() => localeOf(user.lang))

const days = ref<number[]>([])
const from = ref<string | null>('')
const to = ref<string | null>('')
const address = ref('')
const places = ref<FoundPlace[]>([])
const place = ref<FoundPlace | null>(null)
const finding = ref(false)
const nothing = ref(false)

async function find() {
  const words = (address.value ?? '').trim()
  if (!words) return
  finding.value = true
  nothing.value = false
  try {
    places.value = await findPlaces(words, 5)
    nothing.value = !places.value.length
  } catch {
    nothing.value = true
  } finally {
    finding.value = false
  }
}

function choose(item: FoundPlace) {
  place.value = item
  address.value = item.title
  places.value = []
}

function clearPlace() {
  place.value = null
  places.value = []
  nothing.value = false
}

/** the groups that meet when it suits; the nearest first, the ones without a point on the map last */
const found = computed(() =>
  groups.groups
    .filter((group) => !days.value.length || (group.weekday !== null && days.value.includes(group.weekday)))
    .filter((group) => !from.value || (group.time && group.time >= from.value))
    .filter((group) => !to.value || (group.time && group.time <= to.value))
    .map((group) => ({
      group,
      km:
        place.value && group.lat !== undefined && group.lng !== undefined
          ? distanceKm(place.value, { lat: group.lat, lng: group.lng })
          : null
    }))
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || a.group.time.localeCompare(b.group.time))
)

/** "1,2 км" */
const kmText = (km: number) =>
  `${new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(km)} ${text.value.km}`
</script>

<style scoped>
.search {
  max-width: 640px;
  margin: 0 auto;
}

.hint,
.muted {
  color: var(--app-text-muted);
  font-size: 13px;
}

.label {
  font-weight: 600;
  font-size: 15px;
}

.field {
  flex: 1 1 160px;
  max-width: 220px;
}

.places {
  background: var(--app-surface);
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
}

.result {
  position: relative;
}

.distance {
  position: absolute;
  top: 10px;
  right: 14px;
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--v-theme-secondary));
}
</style>
