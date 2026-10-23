<template>
  <AppDialog v-model="open" :title="title" icon="mdi-send-circle-outline" max-width="600">
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>
    <p class="hint">{{ text.invitationsHint }}</p>

    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <p class="label flex-grow-1">{{ text.people }}</p>
      <v-btn
        v-if="event?.ministry"
        variant="text"
        size="small"
        color="buttons"
        class="text-none"
        prepend-icon="mdi-account-multiple-plus-outline"
        @click="addMinistry"
      >
        {{ text.wholeMinistry }}
      </v-btn>
    </div>
    <TransferList
      v-model="uids"
      :items="
        candidates.map((person) => ({
          value: person.uid,
          title: person.name,
          subtitle: person.ministries.join(', ')
        }))
      "
      :right-label="text.people"
      class="mb-2"
    />

    <p class="label">{{ text.daysLabel }}</p>
    <v-chip-group v-model="days" multiple column selected-class="text-secondary">
      <v-chip
        v-for="item of dayItems"
        :key="item.value"
        :value="item.value"
        filter
        variant="outlined"
        size="small"
      >
        {{ item.title }}
      </v-chip>
    </v-chip-group>

    <template #actions>
      <DialogButtons
        :cancel-text="text.later"
        :confirm-text="text.sendInvitations"
        :disabled="busy || !uids.length || !days.length"
        @cancel="open = false"
        @confirm="send"
      />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import TransferList from '@/components/TransferList.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, type ScheduleEvent } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { WorkerError } from '@/stores/worker'
import { format } from '@/utils/format'

/**
 * Invitations to some days of an event: the people (the members of its ministry first) and the days.
 * It opens by itself after a new event is created.
 */
const open = defineModel<boolean>({ default: false })
const props = defineProps<{ event: ScheduleEvent | null; day?: string | null }>()
const emit = defineEmits<{ sent: [count: number] }>()

const schedule = useScheduleStore()
const user = useUserStore()
const { calendar: text, publish } = storeToRefs(useLanguageStore())

const uids = ref<string[]>([])
const days = ref<string[]>([])
const busy = ref(false)
const error = ref('')

const title = computed(() =>
  props.event ? `${text.value.invitations}: ${schedule.nameOf(props.event)}` : ''
)

/** the members of the ministry first */
const candidates = computed(() => {
  const ministry = props.event?.ministry ?? ''
  return [...schedule.people].sort(
    (a, b) => Number(b.ministries.includes(ministry)) - Number(a.ministries.includes(ministry))
  )
})

const addMinistry = () => {
  const members = schedule.people.filter((person) => person.ministries.includes(props.event!.ministry))
  uids.value = [...new Set([...uids.value, ...members.map((person) => person.uid)])]
}

/** the coming days of the event: a single one, or two weeks of a repeated one */
const dayItems = computed(() => {
  const event = props.event
  if (!event) return []
  const locale = { ua: 'uk', ru: 'ru', en: 'en' }[user.lang]
  const label = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' })
  const list: string[] = []
  if (event.day) list.push(event.day)
  else {
    const start = new Date(`${schedule.today}T12:00:00`)
    for (let index = 0; index < 28 && list.length < 14; index++) {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const day = date.toISOString().slice(0, 10)
      if (event.until && day > event.until) break
      if (event.weekdays?.includes(date.getDay())) list.push(day)
    }
  }
  return list.map((value) => ({ value, title: label.format(new Date(`${value}T12:00:00`)) }))
})

watch(open, (value) => {
  if (!value) return
  error.value = ''
  uids.value = []
  // the chosen day, or the first one
  const first = dayItems.value.find((item) => item.value === props.day) ?? dayItems.value[0]
  days.value = first ? [first.value] : []
  schedule.loadChoices().catch(() => undefined)
})

async function send() {
  busy.value = true
  error.value = ''
  try {
    const answer = await schedule.inviteMany(props.event!.id, days.value, uids.value)
    emit('sent', Number(answer.invited) || 0)
    open.value = false
  } catch (cause) {
    const reason =
      cause instanceof WorkerError && cause.message !== 'unreachable'
        ? cause.message
        : publish.value.unreachable
    error.value = format(text.value.failed, { name: reason })
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.hint {
  color: var(--app-text-muted);
  font-size: 14px;
}

.label {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 0;
}
</style>
