<template>
  <!-- a list kept by the administrators: the ministries or the locations of the church -->
  <section>
    <h2 class="admin-title">{{ title }}</h2>
    <p class="hint">{{ text.directoryHint }}</p>

    <div v-for="item of items" :key="item" class="directory-item">
      <span class="flex-grow-1">{{ item }}</span>
      <ButtonTooltip
        icon="$unlink"
        color="delete"
        small
        :text="`${text.removeItem}: ${item}`"
        @click="save(items.filter((entry) => entry !== item))"
      />
    </div>

    <v-text-field
      v-model="newItem"
      :placeholder="text.newItem"
      :disabled="busy"
      density="compact"
      hide-details
      class="mt-3 new-item"
      @keydown.enter="add"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import { useLanguageStore } from '@/stores/language'
import { useWorkerStore } from '@/stores/worker'

const items = defineModel<string[]>({ required: true })
const props = defineProps<{ name: 'ministries' | 'locations'; title: string }>()
const emit = defineEmits<{ error: [cause: unknown] }>()

const worker = useWorkerStore()
const { admin: text } = storeToRefs(useLanguageStore())

const newItem = ref('')
const busy = ref(false)

/** every change is saved at once */
async function save(list: string[]) {
  busy.value = true
  try {
    items.value = await worker.setDirectory(props.name, list)
  } catch (cause) {
    emit('error', cause)
  } finally {
    busy.value = false
  }
}

async function add() {
  const name = (newItem.value ?? '').trim()
  if (!name || items.value.includes(name)) return
  await save([...items.value, name])
  newItem.value = ''
}
</script>

<style scoped>
.directory-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
}

.directory-item + .directory-item {
  border-top: solid 1px var(--app-border-light);
}

.new-item {
  max-width: 360px;
}
</style>
