<template>
  <AddButton v-if="label" :label="label" :icon="icon" @click="open = true" />
  <ButtonTooltip
    v-else
    :icon="activatorIcon || icon"
    :text="tooltip"
    :small="small"
    :large="large"
    :color="color"
    @click="open = true"
  />

  <AppDialog v-model="open" :title="title" :icon="icon" max-width="480">
    <slot />

    <template #actions>
      <DialogButtons
        :confirm-text="confirmText || common.add"
        :disabled="disabled"
        @cancel="open = false"
        @confirm="ok"
      />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import AddButton from '@/components/AddButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import { useLanguageStore } from '@/stores/language'

/** A button (icon, or text when `label` is set) that opens a dialog with a picker and a confirm button */
withDefaults(
  defineProps<{
    icon: string
    /** the button icon when it differs from the dialog one */
    activatorIcon?: string
    tooltip?: string
    title?: string
    color?: string
    small?: boolean
    large?: boolean
    disabled?: boolean
    /** a button with this text instead of an icon */
    label?: string
    confirmText?: string
  }>(),
  { activatorIcon: undefined, tooltip: '', title: '', color: 'buttons', label: undefined, confirmText: '' }
)

const emit = defineEmits<{ ok: [] }>()

const { common } = storeToRefs(useLanguageStore())

const open = ref(false)

function ok() {
  emit('ok')
  open.value = false
}
</script>
