<template>
  <div v-touch="swipe">
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

    <!-- the administrators: the groups whose leader is still to be chosen among the users of the app -->
    <v-alert
      v-if="groups.manage && unregistered.length"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-4 unregistered"
    >
      {{ text.unregisteredGroups }}
      <div class="d-flex flex-wrap ga-2 mt-2">
        <v-chip v-for="group of unregistered" :key="group.id" @click="openGroup(group)">
          {{ groupTitle(group) }}
        </v-chip>
      </div>
    </v-alert>

    <v-tabs v-model="tab" grow class="mb-3" color="secondary">
      <v-tab value="week" prepend-icon="mdi-calendar-week-outline">{{ text.tabWeek }}</v-tab>
      <v-tab value="map" prepend-icon="mdi-map-outline">{{ text.tabMap }}</v-tab>
      <v-tab value="search" prepend-icon="mdi-account-search-outline">{{ text.tabSearch }}</v-tab>
      <v-tab value="list" prepend-icon="mdi-format-list-bulleted">{{ text.tabList }}</v-tab>
      <v-tab v-if="topicsShown" value="topics" prepend-icon="mdi-book-open-page-variant-outline">
        {{ text.tabTopics }}
      </v-tab>
    </v-tabs>

    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />
    <p v-else-if="groups.loaded && !groups.groups.length" class="muted">{{ text.none }}</p>

    <GroupsWeek v-if="tab === 'week'" @open="openGroup" />
    <GroupsMap v-else-if="tab === 'map' && groups.loaded" @open="openGroup" />
    <GroupsSearch v-else-if="tab === 'search'" @open="openGroup" />
    <template v-else-if="tab === 'list'">
      <GroupRow v-for="group of sorted" :key="group.id" :group="group" with-day @open="openGroup" />
    </template>
    <TopicsPanel v-else-if="tab === 'topics'" />

    <GroupDialog v-model="dialog" :group-id="openedId" />
    <NewGroupDialog v-model="newDialog" @created="openGroup" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Touch as vTouch } from 'vuetify/directives'

import GroupDialog from '@/components/groups/GroupDialog.vue'
import GroupRow from '@/components/groups/GroupRow.vue'
import GroupsMap from '@/components/groups/GroupsMap.vue'
import GroupsSearch from '@/components/groups/GroupsSearch.vue'
import GroupsWeek from '@/components/groups/GroupsWeek.vue'
import NewGroupDialog from '@/components/groups/NewGroupDialog.vue'
import TopicsPanel from '@/components/groups/TopicsPanel.vue'
import { useGroupTopicsStore } from '@/stores/groupTopics'
import { groupTitle, useGroupsStore, type GroupsVisibility, type HomeGroup } from '@/stores/groups'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore } from '@/stores/schedule'
import { useSwipeTabs } from '@/composables/useSwipeTabs'
import { WorkerError } from '@/stores/worker'

/**
 * The home groups: by the week (how many meet each day and hour), on the map, a group found for a new
 * member, and as a list; a group opens its card. The administrators create the groups here.
 */
const groups = useGroupsStore()
const schedule = useScheduleStore()
const { groups: text, publish } = storeToRefs(useLanguageStore())

const topics = useGroupTopicsStore()
/** the topics of the meetings: the ministry of the groups, the pastors, the administrators */
const topicsShown = computed(() => Object.values(topics.may).some(Boolean))

const tab = ref<'week' | 'map' | 'search' | 'list' | 'topics'>('week')
/** a swipe on a phone changes the tab; on the map it moves the map */
const swipe = useSwipeTabs(
  tab,
  () => ['week', 'map', 'search', 'list', ...(topicsShown.value ? ['topics' as const] : [])],
  () => tab.value === 'map'
)
const busy = ref(false)
const error = ref('')

const unregistered = computed(() => groups.groups.filter((group) => group.unregistered))

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
  // who may see the topics (an error here leaves the groups as they are)
  topics.load().catch(() => undefined)
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
