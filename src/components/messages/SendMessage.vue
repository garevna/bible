<template>
  <template v-if="!hideActivator">
    <v-btn
      v-if="replyTo"
      variant="text"
      color="secondary"
      size="small"
      class="text-none"
      prepend-icon="mdi-reply-outline"
      @click="openDialog"
    >
      {{ text.reply }}
    </v-btn>
    <ButtonTooltip
      v-else
      icon="mdi-message-arrow-right"
      :text="attach ? text.send : text.newMessage"
      color="secondary"
      :small="small"
      :large="!small"
      @click="openDialog"
    />
  </template>

  <AppDialog
    v-model="open"
    :title="replyTo ? format(text.replyTo, { name: replyTo.fromName }) : attach ? text.send : text.newMessage"
    icon="mdi-message-arrow-right"
    max-width="640"
  >
    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-4" />
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>

    <!-- to people and/or all the members of ministries -->
    <template v-if="!replyTo">
      <p v-if="loaded && !people.length && !ministryItems.length" class="text-medium-emphasis">
        {{ text.noRecipients }}
      </p>
      <v-autocomplete
        v-model="to"
        :items="people"
        item-title="name"
        item-value="uid"
        :label="text.people"
        multiple
        chips
        closable-chips
        density="compact"
        class="mb-2"
      >
        <template #item="{ props: item, item: { raw } }">
          <v-list-item v-bind="item" :subtitle="[...raw.ministries, raw.phone].filter(Boolean).join(' · ')" />
        </template>
      </v-autocomplete>
      <!-- all the people of roles the role of the user may write to -->
      <v-select
        v-if="roleItems.length"
        v-model="roles"
        :items="roleItems"
        item-title="name"
        item-value="id"
        :label="text.roles"
        multiple
        chips
        closable-chips
        density="compact"
        class="mb-2"
      />
      <!-- every ministry is listed; one without members cannot be chosen -->
      <v-select
        v-model="ministries"
        :items="ministryOptions"
        :label="text.ministries"
        multiple
        chips
        closable-chips
        density="compact"
        class="mb-2"
      >
        <template #item="{ props: item, item: { raw } }">
          <v-tooltip :text="text.emptyMinistry" :disabled="raw.members > 0" location="start">
            <template #activator="{ props: tooltip }">
              <div v-bind="tooltip">
                <v-list-item
                  v-bind="item"
                  :disabled="raw.members === 0"
                  :subtitle="format(text.members, { count: raw.members })"
                />
              </div>
            </template>
          </v-tooltip>
        </template>
      </v-select>
    </template>

    <v-textarea v-model="message" :label="text.text" rows="3" auto-grow counter="4000" />

    <template v-if="attachment">
      <p class="text-medium-emphasis mb-1">{{ text.attached }}</p>
      <AttachmentView :attachment="attachment" />
    </template>

    <template #actions>
      <DialogButtons
        :confirm-text="text.sendButton"
        :disabled="busy || !ready"
        @cancel="open = false"
        @confirm="send"
      />
    </template>
  </AppDialog>

  <v-snackbar v-model="done" color="success" timeout="3000">{{
    format(text.sent, { count: sent })
  }}</v-snackbar>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import AttachmentView from '@/components/messages/AttachmentView.vue'
import { useLanguageStore } from '@/stores/language'
import { useWorkerStore, WorkerError, type Attachment, type Message, type Recipient } from '@/stores/worker'
import { format } from '@/utils/format'

/**
 * Writes to ministers: to people and whole ministries (publishers and administrators),
 * or an answer to a message one got. attach: makes the note or topic to send when the dialog opens.
 */
const props = defineProps<{
  attach?: () => Attachment | Promise<Attachment>
  replyTo?: Message
  small?: boolean
  hideActivator?: boolean
}>()
const emit = defineEmits<{ sent: [] }>()

const worker = useWorkerStore()
const { messages: text, publish } = storeToRefs(useLanguageStore())

const open = ref(false)
const busy = ref(false)
const error = ref('')
const loaded = ref(false)

const people = shallowRef<Recipient[]>([])
const ministryItems = shallowRef<string[]>([])
const roleItems = shallowRef<{ id: string; name: string }[]>([])
const roles = ref<string[]>([])
const to = ref<string[]>([])
const ministries = ref<string[]>([])
const message = ref('')
const attachment = shallowRef<Attachment | null>(null)

const done = ref(false)
const sent = ref(0)

/** the ministries with the number of their members (people who get messages) */
const ministryOptions = computed(() =>
  ministryItems.value.map((name) => {
    const members = people.value.filter((person) => person.ministries.includes(name)).length
    return { value: name, title: name, members, props: { disabled: members === 0 } }
  })
)

const ready = computed(
  () =>
    Boolean((message.value ?? '').trim() || attachment.value) &&
    (Boolean(props.replyTo) || to.value.length > 0 || ministries.value.length > 0 || roles.value.length > 0)
)

const reason = (cause: unknown) => {
  if (!(cause instanceof WorkerError) || cause.message === 'unreachable') return publish.value.unreachable
  return cause.message === 'too-many' ? text.value.tooMany : cause.message
}

async function run(action: () => Promise<void>) {
  busy.value = true
  error.value = ''
  try {
    await action()
  } catch (cause) {
    error.value = format(text.value.failed, { name: reason(cause) })
  } finally {
    busy.value = false
  }
}

function openDialog() {
  open.value = true
  to.value = []
  ministries.value = []
  roles.value = []
  message.value = ''
  attachment.value = null
  loaded.value = false
  run(async () => {
    if (props.attach) attachment.value = await props.attach()
    if (!props.replyTo) {
      const answer = await worker.recipients()
      people.value = answer.people
      ministryItems.value = answer.ministries
      roleItems.value = answer.roles ?? []
    }
    loaded.value = true
  })
}

const send = () =>
  run(async () => {
    sent.value = await worker.sendMessage({
      ...(props.replyTo
        ? { replyTo: props.replyTo.id }
        : { to: to.value, ministries: ministries.value, roles: roles.value }),
      text: (message.value ?? '').trim(),
      attachment: attachment.value
    })
    open.value = false
    done.value = true
    emit('sent')
    worker.loadMessages().catch(() => undefined)
  })

defineExpose({ show: openDialog })
</script>
