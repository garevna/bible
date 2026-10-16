<template>
  <div class="page mx-auto" style="max-width: 960px">
    <p v-if="!worker.canReceive" class="text-medium-emphasis">{{ admin.noAccess }}</p>

    <template v-else>
      <div class="d-flex align-center ga-2 mb-2">
        <h2 class="messages-title flex-grow-1">{{ text.title }}</h2>
        <v-btn
          v-if="stale.length"
          variant="tonal"
          color="secondary"
          size="small"
          class="text-none"
          prepend-icon="mdi-broom"
          @click="remove(stale.map((message) => message.id))"
        >
          {{ format(text.removeStale, { count: stale.length }) }}
        </v-btn>
        <SendMessage v-if="worker.canSend" />
        <ButtonTooltip icon="mdi-refresh" :text="admin.reload" color="secondary" @click="load" />
      </div>
      <p class="hint">{{ text.hint }}</p>

      <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />
      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>

      <p v-if="!busy && !worker.messages.length" class="text-medium-emphasis">{{ text.noMessages }}</p>

      <!-- a thread: a message, and the answers to it inside, so it is clear what they answer -->
      <article
        v-for="thread of threads"
        :key="thread.root.id"
        class="message"
        :class="{
          'message--incoming': incoming(thread.root),
          'message--unread': incoming(thread.root) && !thread.root.readAt
        }"
      >
        <div
          v-for="message of [thread.root, ...thread.replies]"
          :key="message.id"
          :class="{ reply: message !== thread.root }"
        >
          <header class="d-flex align-center ga-2 mb-1">
            <v-icon
              :icon="incoming(message) ? 'mdi-message-arrow-right' : 'mdi-message-arrow-left-outline'"
              size="small"
              color="secondary"
            />
            <span class="message__who">
              {{
                incoming(message)
                  ? format(text.from, { name: message.fromName })
                  : format(text.to, { name: message.toName })
              }}
            </span>
            <v-spacer />
            <small class="text-medium-emphasis">{{ time(message.createdAt) }}</small>
            <ConfirmButton icon="$delete" :text="text.removeMessage" @confirm="remove([message.id])" />
            <!-- an incoming message: answered, or waiting for an answer -->
            <v-icon
              v-if="incoming(message)"
              :icon="answered(message) ? 'mdi-check-circle' : 'mdi-bell-alert'"
              :color="answered(message) ? 'primary' : 'calendar-orange'"
              :aria-label="answered(message) ? text.answered : text.notAnswered"
              size="small"
            />
          </header>

          <p v-if="message.text" class="message__text">{{ message.text }}</p>
          <!-- an invitation: an answer for each of its days, right here -->
          <div v-if="incoming(message) && message.asks?.length" class="asks">
            <div v-for="ask of message.asks" :key="askKey(ask)" class="ask">
              <span class="ask__day">{{ dayLabel(ask.day) }}</span>
              <template v-if="stateOf(ask) === 'waiting'">
                <v-btn
                  size="small"
                  variant="flat"
                  color="primary"
                  class="text-none"
                  @click="answer(ask, 'confirm')"
                >
                  {{ ask.as === 'backup' ? calendar.confirmBackup : calendar.confirm }}
                </v-btn>
                <v-btn size="small" variant="tonal" color="delete" class="text-none" @click="decline(ask)">
                  {{ calendar.cannot }}
                </v-btn>
              </template>
              <v-chip v-else size="small" variant="tonal" :color="stateColor(stateOf(ask))">
                {{ stateText(stateOf(ask)) }}
              </v-chip>
            </div>
          </div>
          <AttachmentView v-if="message.attachment" :attachment="message.attachment" class="mb-2" />

          <div v-if="incoming(message)" class="d-flex flex-wrap ga-2">
            <SendMessage :reply-to="message" />
            <v-btn
              v-if="message.attachment"
              variant="text"
              color="buttons"
              size="small"
              class="text-none"
              prepend-icon="mdi-content-save-outline"
              :disabled="savedIds.includes(message.id)"
              @click="save(message)"
            >
              {{
                savedIds.includes(message.id)
                  ? text.saved
                  : message.attachment.kind === 'topic'
                    ? text.saveTopic
                    : text.saveNote
              }}
            </v-btn>
          </div>
        </div>
      </article>
    </template>

    <!-- "I can't": a reason, or the usual words -->
    <AppDialog
      v-model="declineDialog"
      :title="calendar.cannotTitle"
      icon="mdi-calendar-remove"
      max-width="480"
    >
      <p v-if="declining?.as === 'main'" class="hint">{{ calendar.backupFirst }}</p>
      <v-textarea v-model="reason" :label="calendar.reason" rows="3" auto-grow />
      <template #actions>
        <DialogButtons
          :confirm-text="calendar.cannot"
          danger
          @cancel="declineDialog = false"
          @confirm="sendDecline"
        />
      </template>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import ConfirmButton from '@/components/ConfirmButton.vue'
import AttachmentView from '@/components/messages/AttachmentView.vue'
import SendMessage from '@/components/messages/SendMessage.vue'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import type { Participant } from '@/stores/schedule'
import { useWorkerStore, WorkerError, type Ask, type Message } from '@/stores/worker'
import { formatDateTime, formatDay, localeOf } from '@/utils/dates'
import { format } from '@/utils/format'
import { saveAttachment } from '@/utils/saveAttachment'

/** Messages between ministers of the last day: what one got and what one sent */
const worker = useWorkerStore()
const user = useUserStore()
const { admin, calendar, messages: text, publish } = storeToRefs(useLanguageStore())

const busy = ref(false)
const error = ref('')
const savedIds = ref<string[]>([])

const incoming = (message: Message) => message.toUid === user.uid

/* ---------- invitations: answered right in the message ---------- */

/** the people of the days the invitations ask about, as the calendar has them */
const team = shallowRef<Participant[]>([])
const askKey = (ask: Ask) => `${ask.eventId}|${ask.day}|${ask.uid}|${ask.as}`

type AskState = 'waiting' | 'confirmed' | 'declined' | 'gone'

/** what became of an invitation, wherever it was answered (here, the calendar, Telegram) */
function stateOf(ask: Ask): AskState {
  const member = team.value.find(
    (item) => item.eventId === ask.eventId && item.day === ask.day && item.uid === ask.uid
  )
  if (!member) return 'gone'
  if (ask.as === 'backup') {
    if (member.backupUid !== user.uid) return 'gone'
    if (member.backupStatus === 'invited') return 'waiting'
    return member.backupStatus === 'confirmed' ? 'confirmed' : 'declined'
  }
  if (member.status === 'invited') return 'waiting'
  return member.status === 'declined' ? 'declined' : 'confirmed'
}

const stateText = (state: AskState) =>
  ({
    waiting: '',
    confirmed: text.value.youConfirmed,
    declined: text.value.youDeclined,
    gone: text.value.notActual
  })[state]
const stateColor = (state: AskState) =>
  ({ waiting: 'secondary', confirmed: 'primary', declined: 'delete', gone: 'secondary' })[state]

const dayLabel = (day: string) => formatDay(day, localeOf(user.lang))

async function loadTeam() {
  const days = worker.messages
    .flatMap((message) => (incoming(message) ? (message.asks ?? []) : []))
    .map((ask) => ask.day)
  if (!days.length) return
  const from = days.reduce((a, b) => (a < b ? a : b))
  const to = days.reduce((a, b) => (a > b ? a : b))
  const answer = await worker.request<{ participants: Participant[] }>(
    'GET',
    `/schedule?from=${from}&to=${to}`
  )
  team.value = answer.participants
}

async function answer(ask: Ask, reply: 'confirm' | 'decline', why?: string) {
  await run(async () => {
    await worker.request('POST', '/schedule/answer', {
      eventId: ask.eventId,
      day: ask.day,
      uid: ask.uid,
      as: ask.as,
      answer: reply,
      reason: why
    })
    await loadTeam()
  })
}

const declineDialog = ref(false)
const declining = shallowRef<Ask | null>(null)
const reason = ref('')

function decline(ask: Ask) {
  declining.value = ask
  reason.value = calendar.value.defaultReason
  declineDialog.value = true
}

async function sendDecline() {
  declineDialog.value = false
  await answer(declining.value!, 'decline', reason.value)
}

/** the user answered the message: by a message, or (an invitation) by the buttons of all its days */
const answered = (message: Message) =>
  message.asks?.length
    ? message.asks.every((ask) => stateOf(ask) !== 'waiting')
    : worker.messages.some((item) => item.replyTo === message.id && item.fromUid === user.uid)

/**
 * Threads: a message that answers none (or whose message is gone) with all the answers of its chain
 * inside, in the order they were written; the threads with the latest messages first
 */
const threads = computed(() => {
  const byId = new Map(worker.messages.map((message) => [message.id, message]))
  const rootOf = (message: Message) => {
    let root = message
    const seen = new Set<string>()
    while (root.replyTo && byId.has(root.replyTo) && !seen.has(root.id)) {
      seen.add(root.id)
      root = byId.get(root.replyTo)!
    }
    return root
  }
  const groups = new Map<string, { root: Message; replies: Message[] }>()
  for (const message of worker.messages) {
    const root = rootOf(message)
    const group = groups.get(root.id) ?? { root, replies: [] }
    if (message !== root) group.replies.push(message)
    groups.set(root.id, group)
  }
  const latest = (group: { root: Message; replies: Message[] }) =>
    Math.max(group.root.createdAt, ...group.replies.map((item) => item.createdAt))
  return [...groups.values()]
    .map((group) => ({ ...group, replies: group.replies.sort((a, b) => a.createdAt - b.createdAt) }))
    .sort((a, b) => latest(b) - latest(a))
})

const time = (ms: number) => formatDateTime(ms, localeOf(user.lang))

/** the invitations that need nothing more: every day answered, or gone from the calendar */
const stale = computed(() =>
  worker.messages.filter(
    (message) => message.asks?.length && message.asks.every((ask) => stateOf(ask) !== 'waiting')
  )
)

const remove = (ids: string[]) => run(() => worker.deleteMessages(ids))

async function run(action: () => Promise<void>) {
  error.value = ''
  try {
    await action()
  } catch (cause) {
    const reason =
      cause instanceof WorkerError && cause.message !== 'unreachable'
        ? cause.message
        : publish.value.unreachable
    error.value = format(text.value.failed, { name: reason })
  }
}

/** the messages are read once they are on the screen */
async function load() {
  if (!worker.canReceive) return
  busy.value = true
  await run(async () => {
    await worker.loadMessages()
    await loadTeam()
    await Promise.all(
      worker.messages.filter((message) => incoming(message) && !message.readAt).map(worker.markRead)
    )
  })
  busy.value = false
}

const save = (message: Message) =>
  run(async () => {
    if (!message.attachment) return
    await saveAttachment(message.attachment)
    savedIds.value = [...savedIds.value, message.id]
  })

onMounted(load)
// the rights come from the worker after the page may already be open
watch(() => worker.canReceive, load)
</script>

<style scoped>
.messages-title {
  font-size: 18px;
  color: rgb(var(--v-theme-primary));
}

.hint {
  color: var(--app-text-muted);
  font-size: 14px;
  margin-bottom: 16px;
}

.message {
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  padding: 10px 14px;
  margin-bottom: 10px;
}

.message--incoming {
  background: var(--app-surface);
}

.message--unread {
  border-color: rgb(var(--v-theme-secondary));
}

.asks {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0 0 8px;
}

.ask {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.ask__day {
  min-width: 110px;
  font-weight: 500;
  font-size: 14px;
}

.reply {
  margin: 10px 0 0 16px;
  padding-left: 12px;
  border-left: solid 3px rgb(var(--v-theme-secondary) / 40%);
}

.message__who {
  font-weight: 600;
}

.message__text {
  white-space: pre-wrap;
  margin: 4px 0 8px;
}
</style>
