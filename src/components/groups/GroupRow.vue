<template>
  <button type="button" class="group-row" @click="emit('open', group)">
    <span class="group-name">{{ group.name }}</span>
    <span class="facts">
      <span v-if="withDay || group.time">
        <v-icon icon="mdi-clock-outline" size="x-small" />
        {{ withDay ? meets : group.time }}
      </span>
      <span v-if="group.address"
        ><v-icon icon="mdi-map-marker-outline" size="x-small" /> {{ group.address }}</span
      >
      <span><v-icon icon="mdi-account-star-outline" size="x-small" /> {{ group.leaderName }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import type { HomeGroup } from '@/stores/groups'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import { localeOf } from '@/utils/dates'

/** A home group in a list: its name, when, where and its leader; a click opens it */
const props = defineProps<{ group: HomeGroup; withDay?: boolean }>()
const emit = defineEmits<{ open: [group: HomeGroup] }>()

const user = useUserStore()
const { groups: text } = storeToRefs(useLanguageStore())

const meets = computed(() => {
  if (props.group.weekday === null) return text.value.notSet
  // 2024-01-07 was a Sunday
  const name = new Intl.DateTimeFormat(localeOf(user.lang), { weekday: 'long' }).format(
    new Date(2024, 0, 7 + props.group.weekday)
  )
  return `${name}${props.group.time ? `, ${props.group.time}` : ''}`
})
</script>

<style scoped>
.group-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  text-align: left;
  padding: 10px 14px;
  margin-bottom: 8px;
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface);
  color: var(--app-text);
  cursor: pointer;
}

.group-row:hover {
  border-color: rgb(var(--v-theme-secondary));
}

.group-name {
  font-weight: 600;
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 13px;
  color: var(--app-text-muted);
}
</style>
