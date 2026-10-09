<template>
  <ButtonTooltip
    :icon="icon"
    :text="tooltip"
    :small="small"
    :large="large"
    :fab="fab"
    :color="color"
    :badge="badge"
    :badge-icon="badgeIcon"
    @click="open = true"
  />

  <v-dialog v-model="open" max-width="480">
    <v-card color="homefone" class="pb-4">
      <v-toolbar flat density="compact" color="transparent">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">{{ title }}</v-toolbar-title>
        <v-btn icon="$close" @click="open = false" />
      </v-toolbar>

      <div class="px-5 pb-6">
        <slot />
      </div>

      <v-btn
        variant="outlined"
        color="buttons"
        width="120"
        class="d-block mx-auto"
        :disabled="disabled"
        @click="ok"
      >
        {{ selector.okButton }}
      </v-btn>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import { useLanguageStore } from '@/stores/language'

/** Button that opens a dialog with a picker (slot) and an OK button */
withDefaults(
  defineProps<{
    icon: string
    tooltip?: string
    title?: string
    color?: string
    small?: boolean
    large?: boolean
    fab?: boolean
    badge?: string
    badgeIcon?: string
    disabled?: boolean
  }>(),
  { tooltip: '', title: '', color: 'buttons', badge: undefined, badgeIcon: undefined }
)

const emit = defineEmits<{ ok: [] }>()

const { selector } = storeToRefs(useLanguageStore())

const open = ref(false)

function ok() {
  emit('ok')
  open.value = false
}
</script>
