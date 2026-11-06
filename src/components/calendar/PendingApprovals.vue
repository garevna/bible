<template>
  <!-- the materials waiting for the user (a pastor, or one standing in) to approve them -->
  <section v-if="pending.length" class="pending mb-4">
    <p class="pending__title">
      <v-icon icon="mdi-file-clock-outline" size="small" class="mr-1" />
      {{ format(text.pendingTitle, { count: pending.length }) }}
    </p>
    <v-list density="compact" class="pending__list">
      <v-list-item
        v-for="item of pending"
        :key="item.material.id"
        :title="item.material.title || text.materialsGeneric"
        :subtitle="`${schedule.nameOf(item.occurrence.event)} · ${dayLabel(item.occurrence.day)} · ${item.material.role} · ${item.material.name}`"
        prepend-icon="mdi-file-document-outline"
        @click="openItem(item)"
      >
        <template #append>
          <v-chip size="small" variant="tonal" color="calendar-orange">{{ text.statusPending }}</v-chip>
        </template>
      </v-list-item>
    </v-list>

    <MaterialDialog
      v-if="chosen"
      v-model="dialog"
      :occurrence="chosen.occurrence"
      :role="chosen.material.role"
      :resource="chosen.material.resource ?? ''"
      :may="false"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import MaterialDialog from '@/components/calendar/MaterialDialog.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, type MaterialItem, type Occurrence } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { formatDay, localeOf } from '@/utils/dates'
import { format } from '@/utils/format'

/** The materials of the services waiting for the user's approval: each opens its window */
const schedule = useScheduleStore()
const user = useUserStore()
const { calendar: text } = storeToRefs(useLanguageStore())

interface Pending {
  occurrence: Occurrence
  material: MaterialItem
}

const pending = computed<Pending[]>(() =>
  schedule.occurrences.flatMap((occurrence) =>
    schedule.reviews(occurrence.event)
      ? occurrence.materials
          .filter((material) => material.status === 'pending')
          .map((material) => ({ occurrence, material }))
      : []
  )
)

const dayLabel = (day: string) => formatDay(day, localeOf(user.lang))

const dialog = ref(false)
const chosen = ref<Pending | null>(null)
function openItem(item: Pending) {
  chosen.value = item
  dialog.value = true
}
</script>

<style scoped>
.pending {
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  padding: 8px 12px;
  background: var(--app-surface);
}

.pending__title {
  font-weight: 600;
  margin: 0 0 4px;
}

.pending__list {
  background: transparent;
  padding: 0;
}
</style>
