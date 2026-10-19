<template>
  <div>
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

    <!-- the administrators: a new group, and who sees the groups -->
    <div v-if="groups.manage" class="manage d-flex flex-wrap align-center ga-2 mb-4">
      <v-btn
        variant="tonal"
        color="buttons"
        class="text-none"
        prepend-icon="mdi-plus-thick"
        @click="newDialog = true"
      >
        {{ text.addGroup }}
      </v-btn>
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
      <v-tab value="week" prepend-icon="mdi-calendar-week-outline">{{ text.tabWeek }}</v-tab>
      <v-tab value="map" prepend-icon="mdi-map-outline">{{ text.tabMap }}</v-tab>
      <v-tab value="search" prepend-icon="mdi-account-search-outline">{{ text.tabSearch }}</v-tab>
      <v-tab value="list" prepend-icon="mdi-format-list-bulleted">{{ text.tabList }}</v-tab>
    </v-tabs>

    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />
    <p v-else-if="groups.loaded && !groups.groups.length" class="muted">{{ text.none }}</p>

    <GroupsWeek v-if="tab === 'week'" @open="openGroup" />
    <GroupsMap v-else-if="tab === 'map' && groups.loaded" @open="openGroup" />
    <GroupsSearch v-else-if="tab === 'search'" @open="openGroup" />
    <template v-else-if="tab === 'list'">
      <GroupRow v-for="group of sorted" :key="group.id" :group="group" with-day @open="openGroup" />
    </template>

    <GroupDialog v-model="dialog" :group-id="openedId" />
    <NewGroupDialog v-model="newDialog" @created="openGroup" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'

import GroupDialog from '@/components/groups/GroupDialog.vue'
import GroupRow from '@/components/groups/GroupRow.vue'
import GroupsMap from '@/components/groups/GroupsMap.vue'
import GroupsSearch from '@/components/groups/GroupsSearch.vue'
import GroupsWeek from '@/components/groups/GroupsWeek.vue'
import NewGroupDialog from '@/components/groups/NewGroupDialog.vue'
import { useGroupsStore, type GroupsVisibility, type HomeGroup } from '@/stores/groups'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore } from '@/stores/schedule'
import { WorkerError } from '@/stores/worker'

/**
 * The home groups: by the week (how many meet each day and hour), on the map, a group found for a new
 * member, and as a list; a group opens its card. The administrators create the groups here.
 */
const groups = useGroupsStore()
const schedule = useScheduleStore()
const { groups: text, publish } = storeToRefs(useLanguageStore())

const tab = ref<'week' | 'map' | 'search' | 'list'>('week')
const busy = ref(false)
const error = ref('')

const dialog = ref(false)
const openedId = ref<string | null>(null)
function openGroup(group: HomeGroup) {
  openedId.value = group.id
  dialog.value = true
}

/** by the day of the week, Monday first, then by the time */
const sorted = computed(() =>
  [...groups.groups].sort(
    (a, b) =>
      (((a.weekday ?? 7) + 6) % 7) - (((b.weekday ?? 7) + 6) % 7) ||
      a.time.localeCompare(b.time) ||
      a.leaderName.localeCompare(b.leaderName)
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

const newDialog = ref(false)

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
</style>
