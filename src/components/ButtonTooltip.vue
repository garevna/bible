<template>
  <v-tooltip :text="text" location="top">
    <template #activator="{ props: tooltip }">
      <v-btn
        v-bind="{ ...tooltip, ...$attrs }"
        :icon="icon"
        :size="large ? 'large' : small ? 'small' : 'default'"
        :color="color"
        :variant="fab ? 'elevated' : 'text'"
        :disabled="disabled"
        @click.stop="emit('click')"
      />
    </template>
  </v-tooltip>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    icon: string
    text?: string
    color?: string
    small?: boolean
    large?: boolean
    fab?: boolean
    disabled?: boolean
  }>(),
  { text: '', color: 'buttons' }
)

const emit = defineEmits<{ click: [] }>()
</script>
