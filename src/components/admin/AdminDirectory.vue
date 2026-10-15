<template>
  <!-- a list kept by the administrators: the ministries or the locations of the church -->
  <section>
    <h2 class="admin-title">{{ title }}</h2>
    <p class="hint">{{ text.directoryHint }}</p>

    <div v-for="item of items" :key="item" class="directory-item">
      <span class="flex-grow-1">{{ item }}</span>
      <!-- a location: its address opens on the map (none: online) -->
      <v-text-field
        v-if="addresses"
        :model-value="draftAddresses[item] ?? addresses[item]?.address ?? ''"
        :placeholder="text.address"
        :disabled="busy"
        density="compact"
        hide-details
        class="address mr-2"
        @update:model-value="(value: string) => (draftAddresses[item] = value)"
        @blur="saveAddress(item)"
        @keydown.enter="saveAddress(item)"
      >
        <!-- the point on the map was chosen -->
        <template v-if="addresses[item]?.lat !== undefined" #prepend-inner>
          <v-icon icon="mdi-map-marker-check" size="small" color="secondary" />
        </template>
      </v-text-field>
      <ButtonTooltip
        v-if="addresses"
        icon="mdi-map-search-outline"
        :text="text.findOnMap"
        color="secondary"
        @click="picking = item"
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

    <PlacePicker
      :model-value="Boolean(picking)"
      :location="picking ?? ''"
      :place="picking ? (addresses?.[picking] ?? null) : null"
      @update:model-value="(value: boolean) => value || (picking = null)"
      @picked="(place: Place) => savePlace(picking!, place)"
    />
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import PlacePicker from '@/components/admin/PlacePicker.vue'
import { useLanguageStore } from '@/stores/language'
import type { Place } from '@/stores/schedule'
import { useWorkerStore } from '@/stores/worker'

const items = defineModel<string[]>({ required: true })
/** the addresses of the locations, by location (the list of the locations only) */
const addresses = defineModel<Record<string, Place> | null>('addresses', { default: null })
const props = defineProps<{ name: 'ministries' | 'locations'; title: string }>()
const emit = defineEmits<{ error: [cause: unknown] }>()

const worker = useWorkerStore()
const { admin: text } = storeToRefs(useLanguageStore())

const newItem = ref('')
/** the addresses being written, by location */
const draftAddresses = reactive<Record<string, string>>({})

async function savePlace(location: string, place: Place) {
  busy.value = true
  try {
    addresses.value = await worker.setAddresses({ ...addresses.value, [location]: place })
    delete draftAddresses[location]
  } catch (cause) {
    emit('error', cause)
  } finally {
    busy.value = false
  }
}

/** an address written by hand is saved when it is left (or by Enter); a point of other words goes */
function saveAddress(location: string) {
  const address = draftAddresses[location]
  if (address === undefined || address === (addresses.value?.[location]?.address ?? '')) return
  savePlace(location, { address })
}

/** the location whose place is chosen on the map */
const picking = ref<string | null>(null)
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

.address {
  flex: 0 1 360px;
}

.new-item {
  max-width: 360px;
}
</style>
