<template>
  <AppDialog
    v-model="worker.statusRequestOpen"
    :title="text.requestTitle"
    icon="mdi-account-arrow-up-outline"
    max-width="520"
  >
    <!-- sent: what happens next -->
    <template v-if="worker.statusRequestAt">
      <p class="lead">{{ text.requestSent }}</p>
    </template>
    <template v-else>
      <p class="lead">{{ text.requestLead }}</p>
      <v-text-field
        v-model="note"
        :label="text.requestNote"
        :placeholder="text.requestNoteExample"
        density="compact"
        hide-details
        class="mt-3"
      />
      <v-alert v-if="failed" type="error" variant="tonal" density="compact" class="mt-3">{{
        text.requestFailed
      }}</v-alert>
    </template>

    <template #actions>
      <v-spacer />
      <v-btn
        v-if="worker.statusRequestAt"
        variant="flat"
        color="primary"
        class="text-none px-6"
        @click="close"
      >
        {{ common.close }}
      </v-btn>
      <template v-else>
        <v-btn variant="text" class="text-none" @click="close">{{ text.requestLater }}</v-btn>
        <v-btn variant="flat" color="primary" class="text-none px-6" :loading="busy" @click="send">
          {{ text.requestSend }}
        </v-btn>
      </template>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import { useLanguageStore } from '@/stores/language'
import { useWorkerStore } from '@/stores/worker'

/**
 * A reader asks for the status of a servant: shown by itself once, after the sign up, and from the
 * menu of the avatar. The administrators who give the statuses get the request.
 */
const worker = useWorkerStore()
const { header: text, common } = storeToRefs(useLanguageStore())

const note = ref('')
const busy = ref(false)
const failed = ref(false)

// a new reader: the window opens by itself once, after the sign up (never again, on any device)
watch(
  () => worker.offerStatus,
  (offer) => {
    if (!offer) return
    worker.statusRequestOpen = true
    worker.statusOffered()
  },
  { immediate: true }
)

const close = () => (worker.statusRequestOpen = false)

async function send() {
  busy.value = true
  failed.value = false
  try {
    await worker.requestStatus((note.value ?? '').trim())
  } catch {
    failed.value = true
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.lead {
  font-size: 16px;
  line-height: 1.5;
}
</style>
