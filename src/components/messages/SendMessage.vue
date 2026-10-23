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
      icon="mdi-send-circle-outline"
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
    icon="mdi-send-variant-outline"
    max-width="640"
  >
    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-4" />
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>

    <!-- to people and/or all the members of ministries -->
    <template v-if="!replyTo">
      <p v-if="loaded && !people.length && !ministryItems.length" class="text-medium-emphasis">
        {{ text.noRecipients }}
      </p>
      <!-- whom: one way at a time, each in its tab (the number: how many are chosen there) -->
      <p class="label">{{ text.people }}</p>
      <v-tabs v-model="whom" color="secondary" density="compact" grow class="mb-2">
        <v-tab value="people" class="text-none">{{ text.toPeople }} ({{ to.length }})</v-tab>
        <v-tab v-if="roleItems.length" value="statuses" class="text-none">
          {{ text.toStatuses }} ({{ roles.length }})
        </v-tab>
        <v-tab value="ministries" class="text-none">{{ text.toMinistries }} ({{ ministries.length }})</v-tab>
      </v-tabs>
      <v-window v-model="whom" class="mb-2">
        <v-window-item value="people">
          <TransferList
            v-model="to"
            :items="
              people.map((person) => ({
                value: person.uid,
                title: person.name,
                subtitle: [...person.ministries, person.phone].filter(Boolean).join(' · ')
              }))
            "
            :right-label="text.chosenPeople"
          />
        </v-window-item>
        <!-- all the people of the statuses the user may write to -->
        <v-window-item v-if="roleItems.length" value="statuses">
          <TransferList
            v-model="roles"
            :items="roleItems.map((role) => ({ value: role.id, title: role.name }))"
            :right-label="text.chosenStatuses"
          />
        </v-window-item>
        <!-- every ministry is listed; one without members cannot be chosen -->
        <v-window-item value="ministries">
          <TransferList v-model="ministries" :items="ministryOptions" :right-label="text.ministries" />
        </v-window-item>
      </v-window>
    </template>

    <v-textarea v-model="message" :label="text.text" rows="3" auto-grow counter="4000" />

    <!-- a reply: a picture with it (a task is done by it, when the message asks for one) -->
    <div v-if="replyTo" class="d-flex flex-wrap align-center ga-2 mb-2">
      <v-btn
        variant="tonal"
        color="buttons"
        class="text-none"
        prepend-icon="mdi-image-plus"
        :loading="uploading"
        @click="addPicture"
      >
        {{ attachment?.kind === 'image' ? text.otherPicture : text.addPicture }}
      </v-btn>
      <span v-if="isTask" class="text-medium-emphasis text-body-2">{{ text.taskAnswerHint }}</span>
    </div>

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

  <!-- a task done by the reply: where it went -->
  <AppDialog v-model="taskDone" :title="text.taskDoneTitle" icon="mdi-check-circle-outline" max-width="480">
    <p class="lead">{{ taskDoneText }}</p>
    <template #actions>
      <v-spacer />
      <v-btn variant="flat" color="primary" class="text-none px-6" @click="taskDone = false">{{
        text.ok
      }}</v-btn>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import TransferList from '@/components/TransferList.vue'
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import AttachmentView from '@/components/messages/AttachmentView.vue'
import { useLanguageStore } from '@/stores/language'
import { useWorkerStore, WorkerError, type Attachment, type Message, type Recipient } from '@/stores/worker'
import { format } from '@/utils/format'
import { pickImage, resizeImage } from '@/utils/image'

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
/** the tab of the recipients shown */
const whom = ref<'people' | 'statuses' | 'ministries'>('people')
const message = ref('')
const attachment = shallowRef<Attachment | null>(null)

const done = ref(false)
const sent = ref(0)

/** the message replied to asks for a task: a picture, a note or a topic does it */
const isTask = computed(() => Boolean(props.replyTo?.asks?.some((ask) => ask.as === 'task')))
const uploading = ref(false)
/** a picture of the device: kept in the private channel of the pictures, then attached */
async function addPicture() {
  const file = await pickImage()
  if (!file) return
  uploading.value = true
  error.value = ''
  try {
    const image = await resizeImage(file, { size: 1600 })
    const kept = (await worker.request<{ image: string }>('POST', '/posts/upload', { image })).image
    attachment.value = { kind: 'image', post: { title: '', items: [], image: kept } }
  } catch (cause) {
    error.value =
      cause instanceof WorkerError && cause.message === 'no-storage'
        ? text.value.noStorage
        : cause instanceof DOMException || cause instanceof TypeError
          ? text.value.badPicture
          : format(text.value.failed, { name: reason(cause) })
  } finally {
    uploading.value = false
  }
}
const taskDone = ref(false)
const taskDoneText = ref('')

/** the ministries with the number of their members (people who get messages) */
const ministryOptions = computed(() =>
  ministryItems.value.map((name) => {
    const members = people.value.filter((person) => person.ministries.includes(name)).length
    return {
      value: name,
      title: name,
      subtitle: format(text.value.members, { count: members }),
      disabled: members === 0
    }
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
    const answer = await worker.sendMessage({
      ...(props.replyTo
        ? { replyTo: props.replyTo.id }
        : { to: to.value, ministries: ministries.value, roles: roles.value }),
      text: (message.value ?? '').trim(),
      attachment: attachment.value
    })
    sent.value = answer.sent
    open.value = false
    // the task is done: a window says where it went; otherwise a short word
    if (answer.submission) {
      taskDoneText.value = answer.submission.approverName
        ? format(text.value.taskDoneApprover, { name: answer.submission.approverName })
        : text.value.taskDoneQueue
      taskDone.value = true
    } else done.value = true
    emit('sent')
    worker.loadMessages().catch(() => undefined)
  })

defineExpose({ show: openDialog })
</script>

<style scoped>
.label {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 0 0 4px;
}
</style>
