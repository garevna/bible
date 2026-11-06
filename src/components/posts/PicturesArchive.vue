<template>
  <div class="archive">
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>
    <v-alert
      v-if="notice"
      type="success"
      variant="tonal"
      density="compact"
      closable
      class="mb-3"
      @click:close="notice = ''"
    >
      {{ notice }}
    </v-alert>
    <p class="muted mb-2">{{ text.archiveHint }}</p>

    <!-- by the days it was kept, by its title or the one who kept it -->
    <div class="filters">
      <DateField v-model="from" :label="text.archiveFrom" density="compact" clearable class="field" />
      <DateField v-model="to" :label="text.archiveTo" density="compact" clearable class="field" />
      <v-text-field
        v-model="search"
        :label="text.archiveSearch"
        density="compact"
        hide-details
        clearable
        class="field"
      />
      <v-btn variant="tonal" color="buttons" class="text-none" prepend-icon="mdi-magnify" @click="find">
        {{ text.archiveFind }}
      </v-btn>
    </div>
    <v-btn
      v-if="canImport && !pick"
      variant="text"
      color="secondary"
      class="text-none mb-2"
      prepend-icon="mdi-archive-arrow-down-outline"
      :disabled="busy"
      @click="importOlder"
    >
      {{ text.archiveImport }}
    </v-btn>

    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />
    <p v-if="loaded && !pictures.length" class="muted">{{ text.archiveEmpty }}</p>
    <div class="grid">
      <figure
        v-for="picture of pictures"
        :key="picture.id"
        class="picture"
        :class="{ pickable: pick }"
        @click="pick && emit('picked', picture.id)"
      >
        <StoredImage :src="picture.id" class="image" />
        <figcaption>
          <span class="title">{{ picture.title || text.archiveUntitled }}</span>
          <span class="muted">{{ captionOf(picture) }}</span>
        </figcaption>
        <ConfirmButton
          v-if="picture.removable && !pick"
          icon="mdi-delete-outline"
          :text="text.archiveRemove"
          class="remove"
          @confirm="remove(picture)"
        />
      </figure>
    </div>
    <div v-if="more" class="d-flex justify-center mt-3">
      <v-btn variant="tonal" color="buttons" class="text-none" :disabled="busy" @click="load(true)">
        {{ text.archiveMore }}
      </v-btn>
    </div>

    <!-- in use: asked again -->
    <AppDialog v-model="asking" :title="text.archiveRemove" icon="mdi-alert-outline" max-width="480">
      <p>{{ format(text.archiveInUse, { count: inUse }) }}</p>
      <template #actions>
        <DialogButtons :confirm-text="common.delete" @cancel="asking = false" @confirm="removeAnyway" />
      </template>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ConfirmButton from '@/components/ConfirmButton.vue'
import DateField from '@/components/DateField.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import StoredImage from '@/components/posts/StoredImage.vue'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import { useWorkerStore, WorkerError } from '@/stores/worker'
import { formatDateTime, localeOf } from '@/utils/dates'
import { format } from '@/utils/format'

/**
 * The archive of the pictures: the pictures stay in the private Telegram channel, the archive knows
 * when and by whom each was kept. Found by the days and the words; one is chosen (pick), or removed.
 */
defineProps<{ pick?: boolean }>()
const emit = defineEmits<{ picked: [image: string] }>()

interface Picture {
  id: string
  messageId: number | null
  title: string
  uid: string
  name: string
  createdAt: number
  removable: boolean
}

const PAGE = 24

const worker = useWorkerStore()
const user = useUserStore()
const { posts: text, common, publish } = storeToRefs(useLanguageStore())

const pictures = ref<Picture[]>([])
const canImport = ref(false)
const loaded = ref(false)
const more = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const from = ref<string | null>(null)
const to = ref<string | null>(null)
const search = ref('')

const captionOf = (picture: Picture) =>
  [formatDateTime(picture.createdAt, localeOf(user.lang)), picture.name].filter(Boolean).join(' · ')

/** the start of a day of the user, in ms */
const startOf = (day: string, next = 0) => {
  const date = new Date(`${day}T00:00:00`)
  date.setDate(date.getDate() + next)
  return date.getTime()
}

async function run(action: () => Promise<unknown>) {
  busy.value = true
  error.value = ''
  try {
    await action()
  } catch (cause) {
    error.value =
      cause instanceof WorkerError && cause.message !== 'unreachable'
        ? cause.message
        : publish.value.unreachable
  } finally {
    busy.value = false
  }
}

/** the newest first; more: the ones kept before the last shown */
const load = (further = false) =>
  run(async () => {
    const last = further ? pictures.value.at(-1)?.createdAt : undefined
    const end = to.value ? startOf(to.value, 1) : undefined
    const params = new URLSearchParams({ limit: String(PAGE) })
    if (from.value) params.set('from', String(startOf(from.value)))
    if (last !== undefined || end !== undefined)
      params.set('to', String(Math.min(last ?? Infinity, end ?? Infinity)))
    if (search.value?.trim()) params.set('q', search.value.trim())
    const answer = await worker.request<{ pictures: Picture[]; canImport: boolean }>(
      'GET',
      `/pictures?${params}`
    )
    pictures.value = further ? [...pictures.value, ...answer.pictures] : answer.pictures
    canImport.value = answer.canImport
    more.value = answer.pictures.length === PAGE
    loaded.value = true
  })

const find = () => {
  notice.value = ''
  return load()
}

const asking = ref(false)
const inUse = ref(0)
let removing: Picture | null = null

async function remove(picture: Picture, force = false) {
  removing = picture
  notice.value = ''
  busy.value = true
  error.value = ''
  try {
    const path = `/pictures/${encodeURIComponent(picture.id)}${force ? '?force=1' : ''}`
    const answer = await worker.request<{ channel: boolean }>('DELETE', path)
    pictures.value = pictures.value.filter((item) => item.id !== picture.id)
    notice.value = answer.channel ? text.value.archiveRemoved : text.value.archiveRemovedHere
  } catch (cause) {
    if (cause instanceof WorkerError && cause.message === 'in-use') {
      inUse.value = Number(cause.data.uses ?? 1)
      asking.value = true
    } else
      error.value =
        cause instanceof WorkerError && cause.message !== 'unreachable'
          ? cause.message
          : publish.value.unreachable
  } finally {
    busy.value = false
  }
}

function removeAnyway() {
  asking.value = false
  if (removing) remove(removing, true)
}

const importOlder = () =>
  run(async () => {
    const { added } = await worker.request<{ added: number }>('POST', '/pictures/import', {})
    await load()
    notice.value = format(text.value.archiveImported, { count: added })
  })

onMounted(() => load())
</script>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.field {
  flex: 1 1 180px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.picture {
  position: relative;
  margin: 0;
  border: solid 1px var(--app-border-light);
  border-radius: var(--app-radius);
  overflow: hidden;
}

.pickable {
  cursor: pointer;
}

.pickable:hover {
  outline: solid 2px rgb(var(--v-theme-secondary));
}

.image {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

figcaption {
  display: flex;
  flex-direction: column;
  padding: 4px 8px 6px;
  font-size: 13px;
}

.title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted {
  color: var(--app-text-muted);
  font-size: 13px;
}

.remove {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgb(var(--v-theme-surface));
  border-radius: 50%;
}
</style>
