<template>
  <div>
    <div ref="mapBox" class="map" :aria-label="text.tabMap" />
    <p v-if="noMap" class="muted mt-1">{{ admin.noMap }}</p>
    <p v-if="unplaced.length" class="muted mt-1">
      {{ format(text.notOnMap, { names: unplaced.map((group) => group.name).join(', ') }) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { Map as MapLibre, Marker, Popup } from 'maplibre-gl'

import { useGroupsStore, type HomeGroup } from '@/stores/groups'
import { useLanguageStore } from '@/stores/language'
import { format } from '@/utils/format'

/**
 * The home groups on the map (MapLibre and the tiles of OpenStreetMap, loaded when it opens): a marker
 * for each group with a point; the cursor on it shows the address and the leader, a click opens the group
 */
const emit = defineEmits<{ open: [group: HomeGroup] }>()

const groups = useGroupsStore()
const { groups: text, admin } = storeToRefs(useLanguageStore())

/** Kharkiv: where the map starts when no group has a point */
const KHARKIV = { lng: 36.2304, lat: 49.9935 }

const mapBox = ref<HTMLDivElement | null>(null)
const noMap = ref(false)
let map: MapLibre | null = null
let markers: Marker[] = []
let hint: Popup | null = null
let lib: typeof import('maplibre-gl') | null = null

const placed = computed(() =>
  groups.groups.filter((group) => group.lat !== undefined && group.lng !== undefined)
)
const unplaced = computed(() =>
  groups.groups.filter((group) => group.lat === undefined || group.lng === undefined)
)

/** the words of the hint: put as text, never as HTML (the names are people's) */
function hintOf(group: HomeGroup) {
  const box = document.createElement('div')
  box.className = 'group-hint'
  const address = document.createElement('div')
  address.textContent = group.address || group.name
  const leader = document.createElement('div')
  leader.className = 'group-hint__leader'
  leader.textContent = group.leaderName
  box.append(address, leader)
  return box
}

function drawMarkers() {
  if (!map || !lib) return
  markers.forEach((marker) => marker.remove())
  markers = placed.value.map((group) => {
    const marker = new lib!.Marker({ color: '#0090B0' }).setLngLat([group.lng!, group.lat!]).addTo(map!)
    const element = marker.getElement()
    element.style.cursor = 'pointer'
    element.setAttribute('aria-label', `${group.name}: ${group.address}`)
    element.dataset.group = group.id
    element.addEventListener('mouseenter', () => {
      hint?.remove()
      hint = new lib!.Popup({ closeButton: false, offset: 30 })
        .setLngLat([group.lng!, group.lat!])
        .setDOMContent(hintOf(group))
        .addTo(map!)
    })
    element.addEventListener('mouseleave', () => hint?.remove())
    element.addEventListener('click', (event) => {
      event.stopPropagation()
      hint?.remove()
      emit('open', group)
    })
    return marker
  })
  // all the groups in sight
  if (placed.value.length > 1) {
    const bounds = new lib.LngLatBounds()
    placed.value.forEach((group) => bounds.extend([group.lng!, group.lat!]))
    map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 })
  } else if (placed.value.length === 1) {
    map.jumpTo({ center: [placed.value[0]!.lng!, placed.value[0]!.lat!], zoom: 14 })
  }
}

onMounted(async () => {
  await nextTick()
  if (!mapBox.value) return
  try {
    lib = await import('maplibre-gl')
    await import('maplibre-gl/dist/maplibre-gl.css')
    map = new lib.Map({
      container: mapBox.value,
      center: [KHARKIV.lng, KHARKIV.lat],
      zoom: 11,
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
    map.addControl(new lib.NavigationControl({ showCompass: false }))
    drawMarkers()
  } catch (error) {
    console.warn('The map is not loaded\n', error)
    noMap.value = true
  }
})

watch(() => groups.groups, drawMarkers)

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<style scoped>
.map {
  height: min(60vh, 520px);
  border-radius: var(--app-radius);
  overflow: hidden;
  border: solid 1px var(--app-border);
}

.muted {
  color: var(--app-text-muted);
  font-size: 13px;
}

:global(.group-hint) {
  font-size: 13px;
  color: #222;
}

:global(.group-hint__leader) {
  color: #555;
  margin-top: 2px;
}
</style>
