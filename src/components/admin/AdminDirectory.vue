<template>
  <!-- a list kept by the administrators: the ministries or the locations of the church -->
  <section>
    <h2 class="admin-title">{{ title }}</h2>
    <p class="hint">{{ text.directoryHint }}</p>

    <div v-for="item of items" :key="item" class="directory-item">
      <span class="flex-grow-1">{{ item }}</span>
      <!-- a ministry: its leaders plan its events -->
      <v-autocomplete
        v-if="leaders"
        :model-value="leaders[item] ?? []"
        :items="people"
        item-title="name"
        item-value="uid"
        :label="text.leaders"
        :disabled="busy"
        multiple
        chips
        closable-chips
        density="compact"
        hide-details
        class="leaders mr-2"
        @update:model-value="(uids: string[]) => saveLeaders(item, uids)"
      />
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
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore } from '@/stores/schedule'
import { useWorkerStore } from '@/stores/worker'

const items = defineModel<string[]>({ required: true })
/** the leaders of the ministries, by ministry (the list of the ministries only) */
const leaders = defineModel<Record<string, string[]> | null>('leaders', { default: null })
const props = defineProps<{ name: 'ministries' | 'locations'; title: string }>()
const emit = defineEmits<{ error: [cause: unknown] }>()

const worker = useWorkerStore()
const { admin: text } = storeToRefs(useLanguageStore())

const schedule = useScheduleStore()
/** the ministers to choose the leaders from */
const people = ref<{ uid: string; name: string }[]>([])
onMounted(async () => {
  if (!leaders.value) return
  await schedule.loadChoices().catch(() => undefined)
  people.value = schedule.people
})

/** a change of the leaders of a ministry is saved at once */
async function saveLeaders(ministry: string, uids: string[]) {
  busy.value = true
  try {
    leaders.value = await worker.setLeaders({ ...leaders.value, [ministry]: uids })
  } catch (cause) {
    emit('error', cause)
  } finally {
    busy.value = false
  }
}

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

.leaders {
  flex: 0 1 360px;
}

.new-item {
  max-width: 360px;
}
</style>
