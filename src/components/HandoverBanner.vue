<template>
  <!-- a deputy asked to take the duties of a leader over: answered here, on any page -->
  <div v-if="asked.length" class="handover-banners">
    <v-alert
      v-for="item of asked"
      :key="item.ministry"
      type="info"
      variant="tonal"
      icon="mdi-account-switch-outline"
      density="compact"
      class="mb-2"
    >
      <div class="d-flex flex-wrap align-center ga-2">
        <span class="flex-grow-1">
          {{ format(text.handoverAsked, { ministry: item.ministry }) }}
          <template v-if="item.until">{{
            format(text.handoverUntilDay, { day: dayText(item.until) })
          }}</template>
        </span>
        <v-btn
          size="small"
          variant="flat"
          color="primary"
          class="text-none"
          :loading="busy"
          @click="answer(item.ministry, 'accept')"
        >
          {{ text.handoverAccept }}
        </v-btn>
        <v-btn
          size="small"
          variant="tonal"
          color="delete"
          class="text-none"
          :disabled="busy"
          @click="answer(item.ministry, 'decline')"
        >
          {{ text.handoverDecline }}
        </v-btn>
      </div>
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import { useWorkerStore } from '@/stores/worker'
import { fullDateFormat, localeOf } from '@/utils/dates'
import { format } from '@/utils/format'

/** The handovers asked of the user: "Приймаю" or "Не можу" (Telegram has the same buttons) */
const worker = useWorkerStore()
const user = useUserStore()
const { admin: text } = storeToRefs(useLanguageStore())

const busy = ref(false)
const asked = computed(() =>
  worker.handovers.filter((item) => item.toUid === user.uid && item.status === 'pending')
)

const dayText = (day: string) => fullDateFormat(new Date(`${day}T12:00:00`), localeOf(user.lang))

async function answer(ministry: string, reply: 'accept' | 'decline') {
  busy.value = true
  try {
    await worker.answerHandover(ministry, reply)
  } catch (error) {
    console.warn('The handover is not answered\n', error)
    await worker.loadRole()
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.handover-banners {
  max-width: 900px;
  /* below the plate of the title of the page */
  margin: 40px auto 0;
  padding: 0 16px;
}
</style>
