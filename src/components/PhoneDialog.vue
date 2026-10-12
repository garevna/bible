<template>
  <AppDialog v-model="open" :title="title || text.myPhone" icon="mdi-cellphone" max-width="460">
    <p class="hint">{{ text.phoneNeeded }}</p>
    <PhoneInput v-model="phone" v-model:valid="valid" :disabled="busy" />
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-4">{{ error }}</v-alert>

    <template #actions>
      <DialogButtons
        :confirm-text="common.save"
        :disabled="busy || !valid"
        @cancel="open = false"
        @confirm="save"
      />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import PhoneInput from '@/components/PhoneInput.vue'
import { useLanguageStore } from '@/stores/language'

/** The mobile number of a minister: their own, or one an administrator enters for them */
const open = defineModel<boolean>({ default: false })
const props = defineProps<{
  number: string | null
  title?: string
  submit: (phone: string) => Promise<unknown>
}>()

const { common, header: text, publish } = storeToRefs(useLanguageStore())

const phone = ref('')
const valid = ref(false)
const busy = ref(false)
const error = ref('')

watch(open, (value) => {
  if (!value) return
  phone.value = props.number ?? ''
  error.value = ''
})

async function save() {
  busy.value = true
  error.value = ''
  try {
    await props.submit(phone.value)
    open.value = false
  } catch {
    error.value = publish.value.unreachable
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.hint {
  color: var(--app-text-muted);
  font-size: 14px;
  margin-bottom: 16px;
}
</style>
