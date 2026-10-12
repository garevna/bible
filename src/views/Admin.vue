<template>
  <div class="page mx-auto" style="max-width: 960px">
    <p v-if="!worker.isAdmin" class="text-medium-emphasis">{{ text.noAccess }}</p>

    <template v-else>
      <div class="d-flex align-center ga-2 mb-2">
        <h2 class="admin-title flex-grow-1">{{ text.title }}</h2>
        <ButtonTooltip icon="mdi-refresh" :text="text.reload" color="secondary" @click="load" />
      </div>
      <p class="hint">{{ text.hint }}</p>
      <p class="hint">{{ text.remove }}: {{ text.removeHint }}.</p>

      <v-text-field
        v-model="query"
        :placeholder="text.search"
        prepend-inner-icon="$search"
        density="compact"
        clearable
        hide-details
        class="mb-4"
      />

      <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />
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

      <p v-if="!busy && !shown.length" class="text-medium-emphasis">{{ text.noUsers }}</p>

      <div v-for="item of shown" :key="item.uid" class="user-row">
        <div class="flex-grow-1 user-info">
          <div class="user-name">
            {{ item.name || item.email || item.uid }}
            <v-chip v-if="item.owner" size="x-small" color="secondary" variant="tonal" class="ml-1">{{
              text.owner
            }}</v-chip>
            <v-chip v-else-if="item.uid === user.uid" size="x-small" variant="tonal" class="ml-1">{{
              text.you
            }}</v-chip>
          </div>
          <div class="user-details">
            <span v-if="item.email && item.name">{{ item.email }}</span>
            <span v-if="item.email && !item.emailVerified" class="unverified">{{ text.unverified }}</span>
            <span>{{ format(text.lastSeen, { name: day(item.lastSeen) }) }}</span>
            <span v-if="item.updatedBy">{{ format(text.changedBy, { name: item.updatedBy }) }}</span>
          </div>
        </div>

        <v-select
          :model-value="item.role"
          :items="roleItems"
          :disabled="locked(item) || saving === item.uid"
          :loading="saving === item.uid"
          :aria-label="item.name || item.email || item.uid"
          density="compact"
          hide-details
          class="role-select"
          @update:model-value="changeRole(item, $event)"
        />

        <ConfirmButton
          v-if="!locked(item)"
          icon="mdi-account-remove-outline"
          :text="text.remove"
          @confirm="remove(item)"
        />
        <span v-else class="remove-placeholder" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import ConfirmButton from '@/components/ConfirmButton.vue'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import { ROLES, useWorkerStore, WorkerError, type Role, type UserView } from '@/stores/worker'
import { format } from '@/utils/format'

/** The dashboard of the roles: who signed in to the app and what they may do */
const worker = useWorkerStore()
const user = useUserStore()
const { admin: text, publish } = storeToRefs(useLanguageStore())

const users = shallowRef<UserView[]>([])
const query = ref('')
const busy = ref(false)
const saving = ref<string | null>(null)
const error = ref('')

const roleItems = computed(() => ROLES.map((role) => ({ value: role, title: text.value[role] })))

const shown = computed(() => {
  const words = (query.value ?? '').trim().toLowerCase()
  if (!words) return users.value
  return users.value.filter((item) => `${item.name ?? ''} ${item.email ?? ''}`.toLowerCase().includes(words))
})

/** the owners and the administrator's own role are not changed here */
const locked = (item: UserView) => item.owner || item.uid === user.uid

const day = (ms: number) => new Date(ms).toLocaleDateString()

const reason = (cause: unknown) =>
  cause instanceof WorkerError && cause.message !== 'unreachable' ? cause.message : publish.value.unreachable

async function run(action: () => Promise<void>) {
  error.value = ''
  try {
    await action()
  } catch (cause) {
    error.value = format(text.value.failed, { name: reason(cause) })
  }
}

async function load() {
  if (!worker.isAdmin) return
  busy.value = true
  await run(async () => {
    users.value = await worker.listUsers()
  })
  busy.value = false
}

async function changeRole(item: UserView, role: Role) {
  saving.value = item.uid
  await run(async () => {
    const updated = await worker.setUserRole(item.uid, role)
    users.value = users.value.map((entry) => (entry.uid === updated.uid ? updated : entry))
  })
  saving.value = null
}

const remove = (item: UserView) =>
  run(async () => {
    await worker.removeUser(item.uid)
    users.value = users.value.filter((entry) => entry.uid !== item.uid)
  })

onMounted(load)
// the role comes from the worker after the page may already be open
watch(() => worker.isAdmin, load)
</script>

<style scoped>
.admin-title {
  font-size: 18px;
  color: rgb(var(--v-theme-primary));
}

.hint {
  color: var(--app-text-muted);
  font-size: 14px;
  margin-bottom: 16px;
}

.user-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 10px 0;
}

.user-row + .user-row {
  border-top: solid 1px var(--app-border-light);
}

.user-info {
  min-width: 200px;
}

.user-name {
  font-weight: 600;
}

.user-details {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.unverified {
  color: rgb(var(--v-theme-warning));
}

.role-select {
  flex: 0 0 200px;
}

.remove-placeholder {
  width: 40px;
}
</style>
