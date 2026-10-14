<template>
  <v-btn variant="text" class="text-none" @click="emit('cancel')">{{ cancelText ?? common.cancel }}</v-btn>
  <v-btn
    variant="flat"
    :color="danger ? 'delete' : 'primary'"
    class="text-none px-6"
    :disabled="disabled"
    :loading="loading"
    @click="emit('confirm')"
  >
    {{ confirmText }}
  </v-btn>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'

/** "Cancel" (or another word for it) and the main action, for the footer of AppDialog */
defineProps<{
  confirmText: string
  cancelText?: string
  disabled?: boolean
  loading?: boolean
  danger?: boolean
}>()
const emit = defineEmits<{ cancel: []; confirm: [] }>()

const { common } = storeToRefs(useLanguageStore())
</script>
