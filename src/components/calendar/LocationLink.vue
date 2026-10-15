<template>
  <span class="location">
    <v-icon icon="mdi-map-marker-outline" size="x-small" />
    {{ location }}
    <!-- a place with an address: the map opens in a tab of its own, the app stays light -->
    <a
      v-if="address"
      :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`"
      target="_blank"
      rel="noopener noreferrer"
      class="map-link"
      :title="`${text.openMap}: ${address}`"
      :aria-label="`${text.openMap}: ${address}`"
      @click.stop
    >
      <v-icon icon="mdi-map-search-outline" size="small" />
    </a>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'
import { useScheduleStore } from '@/stores/schedule'

/** The place of an event, with a link to Google Maps when the place has an address */
const props = defineProps<{ location: string }>()

const schedule = useScheduleStore()
const { calendar: text } = storeToRefs(useLanguageStore())

const address = computed(() => schedule.addresses[props.location] ?? '')
</script>

<style scoped>
.location {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.map-link {
  display: inline-flex;
  margin-left: 4px;
  color: rgb(var(--v-theme-secondary));
}
</style>
