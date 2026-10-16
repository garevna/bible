<template>
  <!-- a list kept by the administrators: the locations of the church (the ministries have a table of their own) -->
  <section>
    <h2 class="admin-title">{{ title }}</h2>

    <div v-for="item of items" :key="item" class="directory-item">
      <!-- the name: changed in place, saved by the icon at its end (the events keep up) -->
      <v-text-field
        :model-value="draftNames[item] ?? item"
        :label="text.itemName"
        :disabled="busy"
        :append-inner-icon="renamed(item) ? 'mdi-content-save-outline' : undefined"
        density="compact"
        hide-details
        class="name"
        @update:model-value="(value: string) => (draftNames[item] = value)"
        @click:append-inner="rename(item)"
        @keydown.enter="rename(item)"
      />
      <!-- a location: its address opens on the map (none: online) -->
      <v-text-field
        v-if="addresses"
        :model-value="draftAddresses[item] ?? addresses[item]?.address ?? ''"
        :label="text.address"
        :disabled="busy"
        :append-inner-icon="readdressed(item) ? 'mdi-content-save-outline' : undefined"
        density="compact"
        hide-details
        class="address"
        @update:model-value="(value: string) => (draftAddresses[item] = value)"
        @click:append-inner="saveAddress(item)"
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
      <ConfirmButton
        icon="$delete"
        :text="`${text.removeItem}: ${item}`"
        @confirm="save(items.filter((entry) => entry !== item))"
      />
    </div>

    <!-- a new one: added by the icon at the end -->
    <v-text-field
      v-model="newItem"
      :label="text.newItem"
      :disabled="busy"
      append-inner-icon="mdi-plus-thick"
      density="compact"
      hide-details
      class="mt-3 new-item"
      @click:append-inner="add"
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
import ConfirmButton from '@/components/ConfirmButton.vue'
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

const busy = ref(false)
const newItem = ref('')
/** the names and the addresses being written, by item */
const draftNames = reactive<Record<string, string>>({})
const draftAddresses = reactive<Record<string, string>>({})
/** the location whose place is chosen on the map */
const picking = ref<string | null>(null)

const renamed = (item: string) => {
  const name = (draftNames[item] ?? item).trim()
  return Boolean(name) && name !== item
}
const readdressed = (item: string) =>
  draftAddresses[item] !== undefined && draftAddresses[item] !== (addresses.value?.[item]?.address ?? '')

async function run(action: () => Promise<void>) {
  busy.value = true
  try {
    await action()
  } catch (cause) {
    emit('error', cause)
  } finally {
    busy.value = false
  }
}

/** the list of the items: an item added or removed */
const save = (list: string[]) =>
  run(async () => {
    items.value = await worker.setDirectory(props.name, list)
  })

/** another name: the events, the addresses and the rest that have the old one keep up */
const rename = (item: string) =>
  renamed(item) &&
  run(async () => {
    const name = draftNames[item]!.trim()
    items.value = await worker.renameItem(props.name, item, name)
    if (addresses.value?.[item]) {
      const { [item]: place, ...rest } = addresses.value
      addresses.value = { ...rest, [name]: place! }
    }
    delete draftNames[item]
  })

const savePlace = (location: string, place: Place) =>
  run(async () => {
    addresses.value = await worker.setAddresses({ ...addresses.value, [location]: place })
    delete draftAddresses[location]
  })

/** an address written by hand: a point of other words goes */
const saveAddress = (location: string) =>
  readdressed(location) && savePlace(location, { address: draftAddresses[location]! })

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
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.directory-item + .directory-item {
  border-top: solid 1px var(--app-border-light);
}

.name {
  flex: 1 1 200px;
}

.address {
  flex: 1 1 280px;
}

.new-item {
  max-width: 360px;
}
</style>
