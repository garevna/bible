<template>
  <div class="topics">
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>

    <!-- the administrators: the ministry that prepares and sends the topics, the pastor who approves them -->
    <div v-if="topics.may.settings" class="d-flex flex-wrap ga-2 mb-3">
      <v-select
        :model-value="topics.settings.ministry"
        :items="schedule.ministries"
        :label="text.topicsMinistry"
        density="compact"
        hide-details
        class="field"
        @update:model-value="(ministry: string | null) => saveSettings({ ministry })"
      />
      <v-select
        :model-value="topics.settings.approverUid"
        :items="approverItems"
        :label="text.topicsApprover"
        density="compact"
        hide-details
        class="field"
        @update:model-value="(approverUid: string | null) => saveSettings({ approverUid })"
      />
    </div>
    <p v-else-if="!topics.settings.ministry" class="muted">{{ text.topicsNotSet }}</p>

    <div class="d-flex flex-wrap ga-2 mb-3">
      <v-btn
        v-if="topics.may.prepare"
        variant="tonal"
        color="buttons"
        class="text-none"
        prepend-icon="mdi-plus-thick"
        @click="openTopic(null)"
      >
        {{ text.newTopic }}
      </v-btn>
      <v-btn
        v-if="topics.may.recommend"
        variant="tonal"
        color="buttons"
        class="text-none"
        prepend-icon="mdi-lightbulb-on-outline"
        @click="openTopic(null, true)"
      >
        {{ text.recommendTopic }}
      </v-btn>
    </div>

    <p v-if="topics.loaded && !topics.topics.length" class="muted">{{ text.noTopics }}</p>
    <v-list density="compact" class="pa-0">
      <v-list-item
        v-for="topic of topics.topics"
        :key="topic.id"
        :title="topic.title"
        :subtitle="subtitleOf(topic)"
        class="topic-row"
        @click="openTopic(topic.id)"
      >
        <template #prepend>
          <v-icon
            :icon="topic.recommended ? 'mdi-lightbulb-on-outline' : 'mdi-book-open-page-variant-outline'"
          />
        </template>
        <template #append>
          <v-chip v-if="topic.recommended" size="x-small" variant="tonal" color="secondary">
            {{ text.recommended }}
          </v-chip>
          <v-chip v-else size="x-small" variant="tonal" :color="stateColor[topic.status]">
            {{ stateText(topic.status) }}
          </v-chip>
        </template>
      </v-list-item>
    </v-list>

    <TopicDialog v-model="dialog" :topic-id="openedId" :recommend="recommend" @created="opened" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'

import TopicDialog from '@/components/groups/TopicDialog.vue'
import {
  useGroupTopicsStore,
  type GroupTopic,
  type TopicsSettings,
  type TopicStatus
} from '@/stores/groupTopics'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { WorkerError } from '@/stores/worker'
import { formatDay, localeOf } from '@/utils/dates'
import { format } from '@/utils/format'

/**
 * The topics of the meetings of the home groups: the ministry of the groups writes them and sends them
 * to the leaders of the groups; the pastor approves them and recommends their own.
 */
const topics = useGroupTopicsStore()
const schedule = useScheduleStore()
const user = useUserStore()
const { groups: text, calendar, publish } = storeToRefs(useLanguageStore())

const error = ref('')
const dialog = ref(false)
const openedId = ref<string | null>(null)
const recommend = ref(false)

function openTopic(id: string | null, asPastor = false) {
  openedId.value = id
  recommend.value = asPastor
  dialog.value = true
}
/** a new topic written: its window shows it, to send it */
const opened = (topic: GroupTopic) => (openedId.value = topic.id)

const stateColor = { approved: 'primary', pending: 'calendar-orange', returned: 'delete' } as const
const stateText = (state: TopicStatus) =>
  ({
    approved: calendar.value.statusApproved,
    pending: calendar.value.statusPending,
    returned: calendar.value.statusReturned
  })[state]

const subtitleOf = (topic: GroupTopic) =>
  [
    topic.day ? formatDay(topic.day, localeOf(user.lang)) : '',
    topic.name,
    topic.sentTo.length ? format(text.value.sentCount, { count: topic.sentTo.length }) : ''
  ]
    .filter(Boolean)
    .join(' · ')

const approverItems = computed(() => [
  { value: null, title: text.value.topicsNoApproval },
  ...schedule.pastors.map((uid) => ({
    value: uid,
    title: schedule.people.find((person) => person.uid === uid)?.name ?? uid
  }))
])

const reason = (cause: unknown) =>
  cause instanceof WorkerError && cause.message !== 'unreachable' ? cause.message : publish.value.unreachable

async function saveSettings(change: Partial<TopicsSettings>) {
  error.value = ''
  try {
    await topics.saveSettings({ ...topics.settings, ...change })
  } catch (cause) {
    error.value = reason(cause)
  }
}

onMounted(async () => {
  try {
    await topics.load()
    if (topics.may.settings) await schedule.loadChoices()
  } catch (cause) {
    error.value = reason(cause)
  }
})
</script>

<style scoped>
.field {
  min-width: 240px;
  flex: 1 1 240px;
}

.muted {
  color: var(--app-text-muted);
  font-size: 14px;
}

.topic-row {
  border-bottom: solid 1px var(--app-border-light);
}
</style>
