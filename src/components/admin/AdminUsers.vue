<template>
  <section>
    <h2 class="admin-title">{{ text.sectionUsers }}</h2>
    <p class="hint">{{ text.usersHint }}</p>
    <p class="hint">{{ text.rowHint }}</p>

    <!-- the filters: words, a role, a ministry, the readers -->
    <div class="filters">
      <v-text-field
        v-model="query"
        :placeholder="text.search"
        prepend-inner-icon="$search"
        density="compact"
        clearable
        hide-details
        class="filter filter--search"
      />
      <v-select
        v-model="roleFilter"
        :items="roleItems"
        :label="text.filterRole"
        density="compact"
        clearable
        hide-details
        class="filter"
      />
      <v-select
        v-model="ministryFilter"
        :items="ministries"
        :label="text.filterMinistry"
        density="compact"
        clearable
        hide-details
        class="filter"
      />
      <v-switch
        v-model="readers"
        :label="text.showReaders"
        color="secondary"
        density="compact"
        hide-details
        class="flex-grow-0"
      />
    </div>

    <!-- a row opens its details (and their changes) by a click; a phone shows the name only -->
    <v-data-table
      v-model:expanded="expanded"
      :headers="headers"
      :items="shown"
      :loading="busy"
      :no-data-text="text.noUsers"
      :items-per-page="25"
      :items-per-page-text="text.perPage"
      item-value="uid"
      density="comfortable"
      hover
      class="users-table"
      @click:row="
        (_event: unknown, row: { internalItem: unknown; toggleExpand: (item: unknown) => void }) =>
          row.toggleExpand(row.internalItem)
      "
    >
      <template #[`item.name`]="{ item }">
        <div class="d-flex align-center ga-2">
          <!-- a minister: the mobile number given and Telegram linked, or what is missing -->
          <v-tooltip v-if="!isReader(item)" :text="readiness(item)" location="top">
            <template #activator="{ props: tooltip }">
              <v-icon
                v-bind="tooltip"
                :icon="ready(item) ? 'mdi-account-check' : 'mdi-account-alert'"
                :color="ready(item) ? 'primary' : 'error'"
                :aria-label="readiness(item)"
                class="readiness"
              />
            </template>
          </v-tooltip>
          <div>
            <div class="user-name">
              {{ nameOf(item) }}
              <v-chip v-if="item.uid === user.uid" size="x-small" variant="tonal" class="ml-1">{{
                text.you
              }}</v-chip>
            </div>
            <div v-if="item.email && item.name" class="user-email">{{ item.email }}</div>
          </div>
        </div>
      </template>
      <template #[`item.role`]="{ item }">
        <v-chip size="small" variant="tonal" :color="isReader(item) ? undefined : 'secondary'">
          {{ roleName(item.role) }}
        </v-chip>
      </template>
      <template #[`item.lastSeen`]="{ item }">
        <span class="nowrap">{{ day(item.lastSeen) }}</span>
      </template>

      <!-- the details, and their changes -->
      <template #expanded-row="{ columns, item }">
        <tr class="details-row">
          <td :colspan="columns.length">
            <div class="details">
              <div class="d-flex flex-wrap ga-5 align-center">
                <!-- saved by the icon at its end, once it is changed -->
                <v-text-field
                  :model-value="names[item.uid] ?? item.name ?? ''"
                  :label="text.userName"
                  :hint="item.nameSet ? text.nameSetHint : text.nameAccountHint"
                  persistent-hint
                  :disabled="saving === item.uid"
                  :append-inner-icon="
                    (names[item.uid] ?? item.name ?? '') !== (item.name ?? '')
                      ? 'mdi-content-save-outline'
                      : undefined
                  "
                  density="compact"
                  class="field mt-4"
                  @update:model-value="(value: string) => (names[item.uid] = value)"
                  @click:append-inner="saveName(item)"
                  @keydown.enter="saveName(item)"
                />
              </div>

              <div class="info">
                <span v-if="item.email">
                  <v-icon icon="mdi-email-outline" size="x-small" /> {{ item.email }}
                  <span v-if="!item.emailVerified" class="unverified">· {{ text.unverified }}</span>
                </span>
                <span>{{ format(text.lastSeen, { name: day(item.lastSeen) }) }}</span>
                <span v-if="item.updatedBy">{{ format(text.changedBy, { name: item.updatedBy }) }}</span>
                <span>
                  <v-icon icon="mdi-send-outline" size="x-small" />
                  {{ item.telegramChatId ? text.telegramLinked : text.telegramNotLinked }}
                </span>
              </div>

              <div class="d-flex flex-wrap ga-2 align-center">
                <v-select
                  :model-value="item.role"
                  :items="roleItems"
                  :label="text.roleColumn"
                  :disabled="
                    item.uid === user.uid || saving === item.uid || (item.role === SUPERVISOR && !mighty)
                  "
                  :loading="saving === item.uid"
                  density="compact"
                  hide-details
                  class="field"
                  @update:model-value="change(item, { role: $event })"
                />
                <v-select
                  :model-value="ministriesOf(item)"
                  :items="ministries"
                  :label="text.sectionMinistries"
                  :disabled="saving === item.uid"
                  multiple
                  chips
                  closable-chips
                  density="compact"
                  hide-details
                  class="field field--wide"
                  @update:model-value="change(item, { ministries: $event })"
                />
              </div>

              <!-- the roles in the ministries: given in the ministries -->
              <div v-if="rolesOf(item).length" class="info">
                <span>{{ text.ministryRoles }}: {{ rolesOf(item).join(', ') }}</span>
              </div>

              <div class="d-flex flex-wrap ga-2 align-center">
                <v-btn
                  variant="text"
                  color="secondary"
                  class="text-none"
                  prepend-icon="mdi-cellphone-cog"
                  @click="phoneOf = item"
                >
                  {{ item.phone ?? header.myPhone }}
                </v-btn>
                <v-spacer />
                <ConfirmButton
                  v-if="item.uid !== user.uid"
                  icon="mdi-account-remove-outline"
                  :text="`${text.remove}: ${text.removeHint}`"
                  @confirm="remove(item)"
                />
              </div>
            </div>
          </td>
        </tr>
      </template>
    </v-data-table>

    <PhoneDialog
      :model-value="Boolean(phoneOf)"
      :number="phoneOf?.phone ?? null"
      :title="phoneOf ? nameOf(phoneOf) : ''"
      :submit="(phone: string) => change(phoneOf!, { phone })"
      @update:model-value="(value: boolean) => value || (phoneOf = null)"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useDisplay } from 'vuetify'

import ConfirmButton from '@/components/ConfirmButton.vue'
import PhoneDialog from '@/components/PhoneDialog.vue'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import {
  READER,
  SUPERVISOR,
  useWorkerStore,
  type MinistryRoles,
  type Role,
  type RoleDef,
  type UserView
} from '@/stores/worker'
import { formatDate, localeOf } from '@/utils/dates'
import { format } from '@/utils/format'

/**
 * The people of the app as a table: the words, a status and a ministry filter it (the readers on request);
 * a row opens the details, where the name, the status, the ministries and the phone are changed, and
 * their roles in the ministries are shown (they are given in the ministries).
 */
const props = defineProps<{ roles: RoleDef[]; ministries: string[]; ministryRoles?: MinistryRoles }>()
const emit = defineEmits<{ error: [cause: unknown] }>()

const worker = useWorkerStore()
const user = useUserStore()
const { admin: text, header } = storeToRefs(useLanguageStore())
const { smAndDown: phone } = useDisplay()

const users = shallowRef<UserView[]>([])
const query = ref('')
const roleFilter = ref<string | null>(null)
const ministryFilter = ref<string | null>(null)
const readers = ref(false)
const expanded = ref<string[]>([])
const busy = ref(false)
const saving = ref<string | null>(null)
/** the names being written, by user */
const names = reactive<Record<string, string>>({})
/** the user whose mobile number is being entered */
const phoneOf = shallowRef<UserView | null>(null)

/** the name, the role and the last visit (a phone: the name only); the rest is in the details of the row */
const headers = computed(() => {
  const all = [
    { key: 'name', title: text.value.userName, sortable: true, value: (item: UserView) => nameOf(item) },
    {
      key: 'role',
      title: text.value.roleColumn,
      sortable: true,
      value: (item: UserView) => roleName(item.role)
    },
    { key: 'lastSeen', title: text.value.lastSeenColumn, sortable: true }
  ]
  return phone.value ? all.filter((item) => item.key === 'name') : all
})

/** only a supervisor (or an owner) makes or unmakes a supervisor */
const mighty = computed(() => worker.role === 'owner' || worker.role === SUPERVISOR)
const roleItems = computed(() =>
  props.roles
    .filter((role) => mighty.value || role.id !== SUPERVISOR)
    .map((role) => ({ value: role.id, title: role.name }))
)

/** 'Керівник (Музичне служіння)', … */
const rolesOf = (item: UserView) =>
  Object.entries(props.ministryRoles ?? {}).flatMap(([ministry, list]) =>
    list.filter((role) => role.uids.includes(item.uid)).map((role) => `${role.name} (${ministry})`)
  )
const roleName = (id: Role) =>
  props.roles.find((role) => role.id === id)?.name ?? (id === 'owner' ? text.value.owner : id)

/** a minister finished signing up: the mobile number given and Telegram linked */
const ready = (item: UserView) => Boolean(item.phone && item.telegramChatId)
const readiness = (item: UserView) =>
  ready(item)
    ? text.value.ready
    : [!item.phone && text.value.noPhone, !item.telegramChatId && text.value.telegramNotLinked]
        .filter(Boolean)
        .join(', ')

const nameOf = (item: UserView) => item.name || item.email || item.uid
const ministriesOf = (item: UserView) =>
  (item.ministries ?? []).filter((ministry) => props.ministries.includes(ministry))

/** a removed role counts as the reader */
const isReader = (item: UserView) =>
  item.role === READER || !props.roles.some((role) => role.id === item.role)

const shown = computed(() => {
  const words = (query.value ?? '').trim().toLowerCase()
  return users.value
    .filter((item) => readers.value || roleFilter.value === READER || !isReader(item))
    .filter((item) => !roleFilter.value || item.role === roleFilter.value)
    .filter((item) => !ministryFilter.value || ministriesOf(item).includes(ministryFilter.value))
    .filter(
      (item) =>
        !words || `${item.name ?? ''} ${item.email ?? ''} ${item.phone ?? ''}`.toLowerCase().includes(words)
    )
})

const day = (ms: number) => formatDate(new Date(ms), localeOf(user.lang)).short

async function run(action: () => Promise<void>) {
  try {
    await action()
  } catch (cause) {
    emit('error', cause)
  }
}

async function load() {
  busy.value = true
  await run(async () => {
    users.value = (await worker.listUsers()).users
  })
  busy.value = false
}

async function change(
  item: UserView,
  update: { role?: Role; ministries?: string[]; phone?: string | null; name?: string | null }
) {
  saving.value = item.uid
  await run(async () => {
    const updated = await worker.updateUser(item.uid, update)
    users.value = users.value.map((entry) => (entry.uid === updated.uid ? updated : entry))
  })
  saving.value = null
}

/** the name of the administrators; empty: the name of the account, from the next sign in */
async function saveName(item: UserView) {
  const name = (names[item.uid] ?? item.name ?? '').trim()
  await change(item, { name: name || null })
  delete names[item.uid]
}

const remove = (item: UserView) =>
  run(async () => {
    await worker.removeUser(item.uid)
    users.value = users.value.filter((entry) => entry.uid !== item.uid)
  })

onMounted(load)
defineExpose({ load })
</script>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 12px;
}

.filter {
  flex: 1 1 180px;
  max-width: 260px;
}

.filter--search {
  max-width: 360px;
}

.users-table :deep(tbody tr:not(.details-row)) {
  cursor: pointer;
}

.user-name {
  font-weight: 600;
}

.readiness {
  flex: 0 0 auto;
}

.user-email {
  color: var(--app-text-muted);
  font-size: 13px;
}

.nowrap {
  white-space: nowrap;
}

.details-row {
  background: var(--app-light-blue);
}

.details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 4px;
}

.info {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.unverified {
  color: rgb(var(--v-theme-warning));
}

.field {
  flex: 1 1 220px;
  max-width: 320px;
}

.field--wide {
  max-width: 480px;
}
</style>
