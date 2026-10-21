<template>
  <AppDialog
    :model-value="Boolean(worker.statusGranted)"
    :title="text.grantedTitle"
    icon="mdi-party-popper"
    max-width="540"
    @update:model-value="(open: boolean) => open || worker.greeted()"
  >
    <p class="lead">{{ format(text.grantedStatus, { name: worker.statusGranted ?? '' }) }}</p>
    <p class="mt-3">{{ text.grantedNext }}</p>

    <!-- the two steps: the service channel, and the bot that writes in private -->
    <ol class="steps">
      <li v-if="worker.serviceChannel">
        <span>{{ text.grantedChannel }}</span>
        <v-btn
          :href="worker.serviceChannel"
          target="_blank"
          rel="noopener"
          variant="tonal"
          color="buttons"
          class="text-none"
          prepend-icon="mdi-send"
        >
          {{ text.grantedJoin }}
        </v-btn>
      </li>
      <li v-if="worker.serviceBot && !worker.telegramLinked">
        <span>{{ text.grantedBot }}</span>
        <v-btn
          variant="tonal"
          color="buttons"
          class="text-none"
          prepend-icon="mdi-robot-outline"
          @click="linkTelegram"
        >
          {{ header.telegramLink }}
        </v-btn>
      </li>
    </ol>

    <template #actions>
      <v-spacer />
      <v-btn variant="flat" color="primary" class="text-none px-6" @click="worker.greeted()">{{
        text.grantedOk
      }}</v-btn>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import { useLanguageStore } from '@/stores/language'
import { useWorkerStore } from '@/stores/worker'
import { format } from '@/utils/format'

/**
 * The first visit after a status was given: congratulations, the status, and what to do now (join the
 * service channel, link the bot that sends the invitations)
 */
const worker = useWorkerStore()
const { header, header: text } = storeToRefs(useLanguageStore())

/** the bot opens in a tab of its own, with its one-time link (the tab opens first: no popup blocker) */
async function linkTelegram() {
  const tab = window.open('', '_blank')
  try {
    const url = await worker.telegramLink()
    if (tab) tab.location.href = url
    else window.location.href = url
    window.addEventListener('focus', () => worker.loadRole(), { once: true })
  } catch {
    tab?.close()
  }
}
</script>

<style scoped>
.lead {
  font-size: 17px;
  font-weight: 600;
}

.steps {
  padding-left: 20px;
  margin-top: 8px;
}

.steps li {
  margin-bottom: 12px;
}

.steps li span {
  display: block;
  margin-bottom: 6px;
}
</style>
