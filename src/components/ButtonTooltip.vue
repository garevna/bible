<template>
  <v-tooltip :text="text" location="top">
    <template #activator="{ props: tooltip }">
      <!-- <v-btn
        v-bind="{ ...tooltip, ...$attrs }"
        :aria-label="text || undefined"
        :icon="icon"
        :size="large ? 'default' : small ? 'small' : 'default'"
        :color="color"
        variant="text"
        :disabled="disabled"
        @click.stop="emit('click')"
      /> -->
      <v-icon
        v-bind="{ ...tooltip, ...$attrs }"
        :aria-label="text || undefined"
        :icon="icon"
        :size="size || (large ? 'large' : small ? 'small' : 'default')"
        :color="color"
        variant="text"
        :disabled="disabled"
        @click.stop="emit('click')"
      />
    </template>
  </v-tooltip>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

/** The one style of the icon buttons: a text button with a tooltip */
withDefaults(
  defineProps<{
    icon: string
    text?: string
    color?: string
    small?: boolean
    large?: boolean
    size?: number
    disabled?: boolean
  }>(),
  { text: '', color: 'buttons', size: undefined }
)

const emit = defineEmits<{ click: [] }>()
</script>
