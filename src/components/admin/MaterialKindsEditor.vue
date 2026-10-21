<template>
  <section>
    <h2 class="admin-title">{{ text.materialKinds }}</h2>
    <p class="hint">{{ text.materialKindsHint }}</p>

    <!-- for the team of the event; given to the people who come -->
    <div v-for="group of GROUPS" :key="group" class="group">
      <p class="label">{{ group === 'team' ? text.kindsTeam : text.kindsParticipants }}</p>
      <div v-for="kind of kinds.filter((item) => item.group === group)" :key="kind.id" class="kind">
        <v-text-field
          :model-value="names[kind.id] ?? kind.name"
          :disabled="busy"
          :append-inner-icon="renamed(kind) ? 'mdi-content-save-outline' : undefined"
          density="compact"
          hide-details
          @update:model-value="(value: string) => (names[kind.id] = value)"
          @click:append-inner="rename(kind)"
          @keydown.enter="rename(kind)"
        />
        <ConfirmButton
          icon="$unlink"
          :text="`${text.removeKind}: ${kind.name}`"
          @confirm="save(kinds.filter((item) => item.id !== kind.id))"
        />
      </div>
      <v-text-field
        v-model="fresh[group]"
        :label="text.newKind"
        :disabled="busy"
        append-inner-icon="mdi-plus-thick"
        density="compact"
        hide-details
        class="new-kind"
        @click:append-inner="add(group)"
        @keydown.enter="add(group)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'

import ConfirmButton from '@/components/ConfirmButton.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, type MaterialKind } from '@/stores/schedule'
import { useWorkerStore } from '@/stores/worker'

/**
 * The resources of the ministries: the kinds of materials prepared for an event, for its team or
 * given to the people who come. Each change is saved at once, a name by the icon at its end.
 */
const kinds = defineModel<MaterialKind[]>({ required: true })
const emit = defineEmits<{ error: [cause: unknown] }>()

const worker = useWorkerStore()
const schedule = useScheduleStore()
const { admin: text } = storeToRefs(useLanguageStore())

const GROUPS = ['team', 'participants'] as const
const busy = ref(false)
const names = reactive<Record<string, string>>({})
const fresh = reactive<Record<string, string>>({ team: '', participants: '' })

async function save(list: MaterialKind[]) {
  busy.value = true
  try {
    kinds.value = await worker.setMaterialKinds(list)
    // the roles of the events choose from them
    schedule.materialKinds = kinds.value
  } catch (cause) {
    emit('error', cause)
  } finally {
    busy.value = false
  }
}

const renamed = (kind: MaterialKind) => {
  const name = (names[kind.id] ?? kind.name).trim()
  return Boolean(name) && name !== kind.name
}

async function rename(kind: MaterialKind) {
  if (!renamed(kind)) return
  const name = names[kind.id]!.trim()
  delete names[kind.id]
  await save(kinds.value.map((item) => (item.id === kind.id ? { ...item, name } : item)))
}

async function add(group: 'team' | 'participants') {
  const name = (fresh[group] ?? '').trim()
  if (!name || kinds.value.some((item) => item.name.toLowerCase() === name.toLowerCase())) return
  const id = `k-${Date.now().toString(36)}`
  await save([...kinds.value, { id, name, group }])
  fresh[group] = ''
}
</script>

<style scoped>
.hint {
  color: var(--app-text-muted);
  font-size: 14px;
  margin-bottom: 12px;
}

.label {
  font-weight: 600;
  margin: 12px 0 6px;
}

.kind {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  max-width: 560px;
}

.new-kind {
  max-width: 520px;
}
</style>
