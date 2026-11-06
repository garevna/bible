<template>
  <AppDialog v-model="open" :title="text.forwardTitle" icon="mdi-account-switch-outline" max-width="640">
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>
    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />
    <p class="hint">{{ text.forwardHint }}</p>

    <v-switch
      v-model="on"
      inset
      :label="text.forwardOn"
      color="secondary"
      density="compact"
      hide-details
      class="mb-2"
    />
    <template v-if="on">
      <p v-if="!pastors.length && !busy" class="hint">{{ text.forwardNoPastors }}</p>
      <TransferList
        v-else
        v-model="toUids"
        :items="pastors.map((pastor) => ({ value: pastor.uid, title: pastor.name }))"
        :left-label="text.forwardPastors"
        :right-label="text.forwardChosen"
        class="mb-3"
      />
      <DateField v-model="until" :label="text.forwardUntil" density="compact" clearable class="until" />
    </template>

    <template #actions>
      <DialogButtons
        :confirm-text="common.save"
        :disabled="busy || (on && !toUids.length) || (!on && !forward)"
        @cancel="open = false"
        @confirm="save"
      />
    </template>
  </AppDialog>

  <!-- what was done: to whom the approvals go now -->
  <AppDialog v-model="done" :title="text.forwardTitle" icon="mdi-check-circle-outline" max-width="480">
    <p class="lead">{{ doneText }}</p>
    <template #actions>
      <v-spacer />
      <v-btn variant="flat" color="primary" class="text-none px-6" @click="done = false">{{ text.ok }}</v-btn>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import DateField from '@/components/DateField.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import TransferList from '@/components/TransferList.vue'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import { useWorkerStore, WorkerError } from '@/stores/worker'
import { fullDateFormat, localeOf } from '@/utils/dates'
import { format } from '@/utils/format'

interface Forward {
  toUids: string[]
  until: string | null
}

/**
 * A pastor away: the materials of the services they approve go to the pastors they choose (one or
 * several), until the day given or until it is switched off. The ones chosen are told.
 */
const open = defineModel<boolean>({ default: false })

const worker = useWorkerStore()
const user = useUserStore()
const { header: text, common, publish } = storeToRefs(useLanguageStore())

const busy = ref(false)
const error = ref('')
const forward = ref<Forward | null>(null)
const pastors = ref<{ uid: string; name: string }[]>([])
const on = ref(false)
const toUids = ref<string[]>([])
const until = ref<string | null>(null)
const done = ref(false)
const doneText = ref('')

async function run(action: () => Promise<void>) {
  busy.value = true
  error.value = ''
  try {
    await action()
  } catch (cause) {
    const reason =
      cause instanceof WorkerError && cause.message !== 'unreachable'
        ? cause.message
        : publish.value.unreachable
    error.value = format(text.value.forwardFailed, { name: reason })
  } finally {
    busy.value = false
  }
}

watch(open, (value) => {
  if (!value) return
  run(async () => {
    const answer = await worker.request<{
      forward: Forward | null
      pastors: { uid: string; name: string }[]
    }>('GET', '/approval-forward')
    forward.value = answer.forward
    pastors.value = answer.pastors
    on.value = Boolean(answer.forward)
    toUids.value = [...(answer.forward?.toUids ?? [])]
    until.value = answer.forward?.until ?? null
  })
})

const namesOf = (uids: string[]) =>
  uids.map((uid) => pastors.value.find((pastor) => pastor.uid === uid)?.name ?? uid).join(', ')

const save = () =>
  run(async () => {
    if (on.value) {
      await worker.request('PUT', '/approval-forward', { toUids: toUids.value, until: until.value })
      const day = until.value
        ? format(text.value.forwardUntilDay, {
            day: fullDateFormat(new Date(`${until.value}T12:00:00`), localeOf(user.lang))
          })
        : ''
      doneText.value = format(text.value.forwardDone, { names: namesOf(toUids.value), until: day })
    } else {
      await worker.request('DELETE', '/approval-forward', {})
      doneText.value = text.value.forwardOff
    }
    open.value = false
    done.value = true
  })
</script>

<style scoped>
.hint {
  color: var(--app-text-muted);
  font-size: 14px;
}

.until {
  max-width: 280px;
}
</style>
