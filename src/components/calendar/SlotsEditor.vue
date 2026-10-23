<template>
  <div class="slots">
    <div v-for="(slot, index) of slots" :key="index" class="slot">
      <v-text-field
        v-model="slot.name"
        :label="text.slotName"
        density="compact"
        hide-details
        class="slot-name"
      />
      <v-text-field
        v-model.number="slot.count"
        :label="text.slotCount"
        type="number"
        min="1"
        max="50"
        density="compact"
        hide-details
        class="slot-count"
      />
      <v-checkbox
        v-model="slot.materials"
        :label="text.slotMaterials"
        color="secondary"
        density="compact"
        hide-details
        class="flex-grow-0"
      />
      <!-- what it prepares: the kinds of the resources -->
      <v-chip-group
        v-if="slot.materials && schedule.materialKinds.length"
        v-model="slot.kinds"
        multiple
        column
        selected-class="text-secondary"
        class="slot-kinds"
      >
        <v-chip
          v-for="kind of schedule.materialKinds"
          :key="kind.id"
          :value="kind.id"
          size="small"
          variant="outlined"
          filter
        >
          {{ kind.name }}
        </v-chip>
      </v-chip-group>
      <ButtonTooltip icon="$unlink" :text="text.removeSlot" color="delete" @click="slots.splice(index, 1)" />
    </div>
    <v-btn
      variant="text"
      color="buttons"
      size="small"
      class="text-none"
      prepend-icon="mdi-account-plus-outline"
      @click="slots.push({ name: '', count: 1, materials: false, kinds: [], hint: '' })"
    >
      {{ text.addSlot }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, type Slot } from '@/stores/schedule'

/** The roles of the people of an event type or of one event: a name, how many people, materials to prepare */
const slots = defineModel<Slot[]>({ required: true })

const { admin: text } = storeToRefs(useLanguageStore())
const schedule = useScheduleStore()

// the roles saved before the kinds have none
for (const slot of slots.value) slot.kinds ??= []
</script>

<style scoped>
.slot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.slot + .slot {
  border-top: solid 1px var(--app-border-light);
}

.slot-name {
  flex: 1 1 160px;
}

.slot-count {
  flex: 0 0 90px;
}

.slot-kinds {
  flex: 1 1 100%;
}
</style>
