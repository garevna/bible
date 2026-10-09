<template>
  <v-tooltip :text="text" location="top">
    <template #activator="{ props: tooltip }">
      <v-btn
        v-bind="{ ...tooltip, ...$attrs }"
        :aria-label="text || undefined"
        icon
        :size="large ? 'large' : small ? 'small' : 'default'"
        :color="color"
        :variant="fab ? 'elevated' : 'text'"
        :disabled="disabled"
        @click.stop="emit('click')"
      >
        <v-badge v-if="badge || badgeIcon" :content="badge" :icon="badgeIcon" color="secondary" floating>
          <v-icon :icon="icon" />
        </v-badge>
        <v-icon v-else :icon="icon" />
      </v-btn>
    </template>
  </v-tooltip>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

/** Icon button with a tooltip; badge / badgeIcon tell apart buttons that share an icon */
withDefaults(
  defineProps<{
    icon: string
    text?: string
    color?: string
    small?: boolean
    large?: boolean
    fab?: boolean
    disabled?: boolean
    badge?: string
    badgeIcon?: string
  }>(),
  { text: '', color: 'buttons', badge: undefined, badgeIcon: undefined }
)

const emit = defineEmits<{ click: [] }>()
</script>

<style scoped>
:deep(.v-badge__badge) {
  min-width: 14px;
  height: 14px;
  font-size: 10px;
  padding: 0 3px;
}
</style>
