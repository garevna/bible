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

      <!-- the ministries of the church: the members of a ministry get the messages sent to it -->
      <FieldSet :title="text.ministries">
        <p class="hint mb-2">{{ text.ministriesHint }}</p>
        <div class="d-flex flex-wrap align-center ga-2">
          <v-chip
            v-for="ministry of ministryList"
            :key="ministry"
            closable
            variant="tonal"
            color="secondary"
            @click:close="saveMinistries(ministryList.filter((item) => item !== ministry))"
          >
            {{ ministry }}
          </v-chip>
          <v-text-field
            v-model="newMinistry"
            :placeholder="text.newMinistry"
            density="compact"
            hide-details
            class="new-ministry"
            @keydown.enter="addMinistry"
          />
        </div>
      </FieldSet>

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

        <v-select
          :model-value="(item.ministries ?? []).filter((ministry) => ministryList.includes(ministry))"
          :items="ministryList"
          :label="text.ministries"
          :disabled="item.owner || saving === item.uid"
          multiple
          chips
          closable-chips
          density="compact"
          hide-details
          class="ministries-select"
          @update:model-value="changeMinistries(item, $event)"
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
import FieldSet from '@/components/FieldSet.vue'
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
    const answer = await worker.listUsers()
    users.value = answer.users
    ministryList.value = answer.ministries
  })
  busy.value = false
}

async function change(item: UserView, update: { role?: Role; ministries?: string[] }) {
  saving.value = item.uid
  await run(async () => {
    const updated = await worker.updateUser(item.uid, update)
    users.value = users.value.map((entry) => (entry.uid === updated.uid ? updated : entry))
  })
  saving.value = null
}

const changeRole = (item: UserView, role: Role) => change(item, { role })
const changeMinistries = (item: UserView, ministries: string[]) => change(item, { ministries })

/* ---------- ministries ---------- */

const ministryList = ref<string[]>([])
const newMinistry = ref('')

const saveMinistries = (list: string[]) =>
  run(async () => {
    ministryList.value = await worker.setMinistries(list)
  })

async function addMinistry() {
  const name = (newMinistry.value ?? '').trim()
  if (!name || ministryList.value.includes(name)) return
  await saveMinistries([...ministryList.value, name])
  newMinistry.value = ''
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

.ministries-select {
  flex: 1 1 240px;
  max-width: 360px;
}

.new-ministry {
  flex: 0 1 240px;
}

.remove-placeholder {
  width: 40px;
}
</style>
