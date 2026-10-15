<template>
  <AppDialog
    v-model="open"
    :title="`${text.findOnMap}: ${location}`"
    icon="mdi-map-search-outline"
    max-width="720"
  >
    <!-- the address is found by its words; the marker is moved to the very door -->
    <v-text-field
      v-model="query"
      :label="text.searchAddress"
      prepend-inner-icon="$search"
      :loading="searching"
      density="compact"
      clearable
      hide-details
      class="mb-1"
    />
    <v-list v-if="found.length" density="compact" class="found mb-2">
      <v-list-item v-for="item of found" :key="item.key" :title="item.title" @click="choose(item)" />
    </v-list>
    <p v-else-if="nothing" class="muted mb-2">{{ text.nothingFound }}</p>

    <div ref="mapBox" class="map" :aria-label="text.findOnMap" />
    <p v-if="noMap" class="muted mt-1">{{ text.noMap }}</p>
    <p v-else class="muted mt-1">{{ text.moveMarker }}</p>

    <v-text-field v-model="address" :label="text.address" density="compact" hide-details class="mt-2" />

    <template #actions>
      <DialogButtons
        :confirm-text="common.save"
        :disabled="!address.trim()"
        @cancel="open = false"
        @confirm="save"
      />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { Map as MapLibre, Marker } from 'maplibre-gl'

import AppDialog from '@/components/AppDialog.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import { useLanguageStore } from '@/stores/language'
import type { Place } from '@/stores/schedule'

/**
 * The place of a location on the map, free and without keys: the addresses are found by Nominatim
 * (OpenStreetMap), the map is MapLibre with the tiles of OpenStreetMap, loaded only when this opens.
 */
const open = defineModel<boolean>({ default: false })
const props = defineProps<{ location: string; place: Place | null }>()
const emit = defineEmits<{ picked: [place: Place] }>()

const { admin: text, common } = storeToRefs(useLanguageStore())

/** Kharkiv: where the map starts, and what the search prefers */
const KHARKIV = { lng: 36.2304, lat: 49.9935 }
const NOMINATIM = 'https://nominatim.openstreetmap.org'

const query = ref('')
const address = ref('')
const point = ref<{ lat: number; lng: number } | null>(null)
const found = shallowRef<{ key: string; title: string; lat: number; lng: number }[]>([])
const searching = ref(false)
const nothing = ref(false)
const noMap = ref(false)
const mapBox = ref<HTMLDivElement | null>(null)
let map: MapLibre | null = null
let marker: Marker | null = null

/** "вулиця Сумська, 1, Харків" of an answer of Nominatim, or all its words */
function shortAddress(item: { display_name: string; address?: Record<string, string> }) {
  const parts = item.address ?? {}
  const street = [parts.road ?? parts.pedestrian ?? parts.square, parts.house_number]
    .filter(Boolean)
    .join(', ')
  const city = parts.city ?? parts.town ?? parts.village
  return street && city ? `${street}, ${city}` : item.display_name
}

/** the marker at a point, and the map around it */
function placeMarker(lng: number, lat: number) {
  point.value = { lat, lng }
  marker?.setLngLat([lng, lat])
  map?.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16) })
}

/** the address of a point the marker was moved to */
async function addressOf(lng: number, lat: number) {
  try {
    const answer = await fetch(
      `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=uk`
    )
    const item = (await answer.json()) as { display_name?: string; address?: Record<string, string> }
    if (item.display_name) address.value = shortAddress(item as { display_name: string })
  } catch {
    // no address: the point is kept, the words stay as they are
  }
}

async function showMap() {
  await nextTick()
  if (map || !mapBox.value) return
  try {
    const { Map, Marker, NavigationControl } = await import('maplibre-gl')
    await import('maplibre-gl/dist/maplibre-gl.css')
    const start = point.value ?? KHARKIV
    map = new Map({
      container: mapBox.value,
      center: [start.lng, start.lat],
      zoom: point.value ? 16 : 12,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
      }
    })
    map.addControl(new NavigationControl({ showCompass: false }))
    marker = new Marker({ draggable: true, color: '#0090B0' }).setLngLat([start.lng, start.lat]).addTo(map)
    marker.on('dragend', () => {
      const { lng, lat } = marker!.getLngLat()
      point.value = { lat, lng }
      addressOf(lng, lat)
    })
    map.on('click', (event) => {
      placeMarker(event.lngLat.lng, event.lngLat.lat)
      addressOf(event.lngLat.lng, event.lngLat.lat)
    })
  } catch {
    // no WebGL: the search and the address still work
    noMap.value = true
  }
}

watch(open, (value) => {
  // the dialog drops its content when closed: the map goes with it
  if (!value) {
    map?.remove()
    map = marker = null
    return
  }
  query.value = ''
  found.value = []
  nothing.value = false
  address.value = props.place?.address ?? ''
  point.value =
    props.place?.lat !== undefined && props.place?.lng !== undefined
      ? { lat: props.place.lat, lng: props.place.lng }
      : null
  if (map && point.value) placeMarker(point.value.lng, point.value.lat)
  showMap()
})

/** the words are looked up when the typing stops (Nominatim takes one request a second) */
let timer: ReturnType<typeof setTimeout> | undefined
watch(query, (words) => {
  clearTimeout(timer)
  const text = (words ?? '').trim()
  found.value = []
  nothing.value = false
  if (text.length < 3) return
  timer = setTimeout(() => search(text), 700)
})

async function search(words: string) {
  searching.value = true
  try {
    const answer = await fetch(
      `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&accept-language=uk` +
        `&viewbox=${KHARKIV.lng - 0.4},${KHARKIV.lat + 0.2},${KHARKIV.lng + 0.4},${KHARKIV.lat - 0.2}` +
        `&q=${encodeURIComponent(words)}`
    )
    const items = (await answer.json()) as {
      place_id: number
      display_name: string
      lat: string
      lon: string
      address?: Record<string, string>
    }[]
    found.value = items.map((item) => ({
      key: String(item.place_id),
      title: shortAddress(item),
      lat: Number(item.lat),
      lng: Number(item.lon)
    }))
    nothing.value = !items.length
  } catch {
    nothing.value = true
  } finally {
    searching.value = false
  }
}

function choose(item: { title: string; lat: number; lng: number }) {
  address.value = item.title
  found.value = []
  placeMarker(item.lng, item.lat)
}

function save() {
  emit('picked', { address: address.value.trim(), ...(point.value ?? {}) })
  open.value = false
}

onBeforeUnmount(() => map?.remove())
</script>

<style scoped>
.map {
  height: min(50vh, 380px);
  border-radius: var(--app-radius);
  border: solid 1px var(--app-border);
  overflow: hidden;
  background: var(--app-light-blue);
}

.found {
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  max-height: 220px;
  overflow-y: auto;
}

.muted {
  color: var(--app-text-muted);
  font-size: 13px;
}
</style>
