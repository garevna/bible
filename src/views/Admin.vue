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
        <v-select
          v-if="compact"
          v-model="section"
          :items="sections"
          item-title="title"
          item-value="value"
          density="compact"
          hide-details
          class="mb-4"
        />
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
            <AdminRoles v-if="section === 'roles'" v-model="settings.roles" @error="fail" />
            <AdminUsers
              v-else-if="section === 'users'"
              :roles="settings.roles"
              :ministries="settings.ministries"
              @error="fail"
            />
            <AdminDirectory
              v-else-if="section === 'ministries'"
              v-model="settings.ministries"
              name="ministries"
              :title="text.sectionMinistries"
              @error="fail"
            />
            <AdminDirectory
              v-else-if="section === 'locations'"
              v-model="settings.locations"
              name="locations"
              :title="text.sectionLocations"
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
import AdminRoles from '@/components/admin/AdminRoles.vue'
import AdminUsers from '@/components/admin/AdminUsers.vue'
import { useLanguageStore } from '@/stores/language'
import { useWorkerStore, WorkerError, type Manage, type RoleDef } from '@/stores/worker'
import { format } from '@/utils/format'
import type { NoteType } from '@/utils/noteTypes'

/** The dashboard: the sections on the left, each for the roles that have its function */
const worker = useWorkerStore()
const { admin: text, publish } = storeToRefs(useLanguageStore())
const { smAndDown: compact } = useDisplay()

type Section = 'roles' | 'users' | 'ministries' | 'locations'

const all: { value: Section; icon: string; manage: Manage; label: keyof typeof text.value }[] = [
  { value: 'roles', icon: 'mdi-shield-key-outline', manage: 'roles', label: 'sectionRoles' },
  { value: 'users', icon: 'mdi-account-group-outline', manage: 'users', label: 'sectionUsers' },
  { value: 'ministries', icon: 'mdi-hand-heart-outline', manage: 'directories', label: 'sectionMinistries' },
  { value: 'locations', icon: 'mdi-map-marker-outline', manage: 'directories', label: 'sectionLocations' }
]

const sections = computed(() =>
  all
    .filter((item) => worker.manages(item.manage))
    .map((item) => ({ ...item, title: text.value[item.label] }))
)

const section = ref<Section | null>(null)
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
    settings.value = await worker.getSettings()
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
