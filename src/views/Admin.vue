<template>
  <div class="page mx-auto admin-panel" style="max-width: 1100px">
    <p v-if="!worker.isAdmin" class="text-medium-emphasis">{{ text.noAccess }}</p>

    <template v-else>
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        density="compact"
        closable
        class="mb-4"
        @click:close="error = ''"
      >
        {{ error }}
      </v-alert>

      <div class="admin-layout">
        <!-- the sections the role of the user may open; on a phone they are a list above -->
        <v-menu v-if="compact" location="bottom end">
          <template #activator="{ props: menu }">
            <button
              v-bind="menu"
              type="button"
              class="section-pill d-flex justify-space-between align-center mt-3 mb-8"
              :aria-label="text.sections"
            >
              <span>{{ current?.title }}</span>
              <v-icon icon="mdi-dots-vertical" />
            </button>
          </template>
          <v-list density="compact" bg-color="homefone" color="secondary" class="section-menu">
            <v-list-item
              v-for="item of sections"
              :key="item.value"
              :prepend-icon="item.icon"
              :title="item.title"
              :active="item.value === section"
              @click="section = item.value"
            />
          </v-list>
        </v-menu>
        <v-list
          v-else
          v-model:selected="selected"
          nav
          density="compact"
          bg-color="homefone"
          class="admin-nav"
          mandatory
        >
          <v-list-item
            v-for="item of sections"
            :key="item.value"
            :value="item.value"
            :prepend-icon="item.icon"
            :title="item.title"
            color="secondary"
          />
        </v-list>

        <div class="admin-section">
          <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />
          <template v-if="settings">
            <AdminRoles
              v-if="section === 'roles'"
              v-model="settings.roles"
              :ministries="settings.ministries"
              @error="fail"
            />
            <AdminUsers
              v-else-if="section === 'users'"
              :roles="settings.roles"
              :ministries="settings.ministries"
              :ministry-roles="settings.ministryRoles"
              @error="fail"
            />
            <AdminMinistries
              v-else-if="section === 'ministries'"
              v-model="settings.ministries"
              v-model:roles="settings.ministryRoles"
              v-model:translations="settings.translationMinistries"
              @error="fail"
            />
            <AdminDirectory
              v-else-if="section === 'locations'"
              v-model="settings.locations"
              v-model:addresses="settings.addresses"
              name="locations"
              :title="text.sectionLocations"
              @error="fail"
            />
            <AdminEvents
              v-else-if="section === 'events'"
              v-model:event-types="settings.eventTypes"
              v-model:calendar="settings.calendar"
              :ministries="settings.ministries"
              @error="fail"
            />
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDisplay } from 'vuetify'

import AdminDirectory from '@/components/admin/AdminDirectory.vue'
import AdminEvents from '@/components/admin/AdminEvents.vue'
import AdminMinistries from '@/components/admin/AdminMinistries.vue'
import AdminRoles from '@/components/admin/AdminRoles.vue'
import AdminUsers from '@/components/admin/AdminUsers.vue'
import { useLanguageStore } from '@/stores/language'
import type { CalendarSettings, EventType, Place } from '@/stores/schedule'
import { useWorkerStore, WorkerError, type Manage, type MinistryRoles, type RoleDef } from '@/stores/worker'
import { format } from '@/utils/format'
import type { NoteType } from '@/utils/noteTypes'

/** The dashboard: the sections on the left, each for the roles that have its function */
const worker = useWorkerStore()
const { admin: text, publish } = storeToRefs(useLanguageStore())
const { smAndDown: compact } = useDisplay()

type Section = 'roles' | 'users' | 'ministries' | 'locations' | 'events'

const all: { value: Section; icon: string; manage: Manage; label: keyof typeof text.value }[] = [
  { value: 'roles', icon: 'mdi-shield-key-outline', manage: 'roles', label: 'sectionRoles' },
  { value: 'users', icon: 'mdi-account-group-outline', manage: 'users', label: 'sectionUsers' },
  { value: 'ministries', icon: 'mdi-hand-heart-outline', manage: 'directories', label: 'sectionMinistries' },
  { value: 'locations', icon: 'mdi-map-marker-outline', manage: 'directories', label: 'sectionLocations' },
  { value: 'events', icon: 'mdi-calendar-edit-outline', manage: 'schedule', label: 'sectionEvents' }
]

const sections = computed(() =>
  all
    .filter((item) => worker.manages(item.manage))
    .map((item) => ({ ...item, title: text.value[item.label] }))
)

const section = ref<Section | null>(null)
const current = computed(() => sections.value.find((item) => item.value === section.value))
const selected = computed({
  get: () => (section.value ? [section.value] : []),
  set: (value: Section[]) => value[0] && (section.value = value[0])
})
// the first section the role may open
watch(
  sections,
  (list) => {
    if (!list.some((item) => item.value === section.value)) section.value = list[0]?.value ?? null
  },
  { immediate: true }
)

const settings = ref<{
  roles: RoleDef[]
  types: NoteType[]
  ministries: string[]
  locations: string[]
  eventTypes: EventType[]
  calendar: CalendarSettings
  ministryRoles: MinistryRoles
  addresses: Record<string, Place>
  translationMinistries: string[]
} | null>(null)
const busy = ref(false)
const error = ref('')

function fail(cause: unknown) {
  const reason =
    cause instanceof WorkerError && cause.message !== 'unreachable'
      ? cause.message
      : publish.value.unreachable
  error.value = format(text.value.failed, { name: reason })
}

async function load() {
  if (!worker.isAdmin) return
  busy.value = true
  try {
    const loaded = await worker.getSettings()
    // a worker of an older version has no roles of the ministries and no addresses yet
    settings.value = {
      ...loaded,
      ministryRoles: loaded.ministryRoles ?? {},
      addresses: loaded.addresses ?? {},
      translationMinistries: loaded.translationMinistries ?? []
    }
  } catch (cause) {
    fail(cause)
  } finally {
    busy.value = false
  }
}

onMounted(load)
// the rights come from the worker after the page may already be open
watch(() => worker.isAdmin, load)
</script>

<style scoped>
.admin-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.admin-nav {
  flex: 0 0 240px;
  position: sticky;
  top: 120px;
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
}

/* a phone: the sections in a menu under a pill with the current one */
.section-pill {
  width: 100%;
  background: var(--app-available-date);
  padding: 12px 16px 12px 20px;
  border-radius: 36px;
  border: solid 1px var(--app-scrollbar-track);
  color: var(--app-scrollbar-track);
  font-weight: 600;
  font-size: 16px;
  text-align: left;
}

.admin-section {
  flex: 1 1 auto;
  min-width: 0;
}

@media (max-width: 959px) {
  .admin-layout {
    display: block;
  }
}
</style>

<style>
/* shared by the sections of the dashboard */
.admin-panel .admin-title {
  font-size: 18px;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}

.admin-panel .hint {
  color: var(--app-text-muted);
  font-size: 14px;
  margin-bottom: 16px;
}
</style>
