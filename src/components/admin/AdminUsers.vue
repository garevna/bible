<template>
  <section>
    <h2 class="admin-title">{{ text.sectionUsers }}</h2>
    <p class="hint">{{ text.usersHint }}</p>
    <p class="hint">{{ text.remove }}: {{ text.removeHint }}.</p>

    <div class="d-flex flex-wrap align-center ga-4 mb-4">
      <v-text-field
        v-model="query"
        :placeholder="text.search"
        prepend-inner-icon="$search"
        density="compact"
        clearable
        hide-details
        class="search"
      />
      <v-switch
        v-model="readers"
        :label="text.showReaders"
        color="secondary"
        density="compact"
        hide-details
      />
    </div>

    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />
    <p v-if="!busy && !shown.length" class="text-medium-emphasis">{{ text.noUsers }}</p>

    <div v-for="item of shown" :key="item.uid" class="user-row">
      <div class="flex-grow-1 user-info">
        <div class="user-name">
          {{ item.name || item.email || item.uid }}
          <v-chip v-if="item.uid === user.uid" size="x-small" variant="tonal" class="ml-1">{{
            text.you
          }}</v-chip>
        </div>
        <div class="user-details">
          <span v-if="item.email && item.name">{{ item.email }}</span>
          <span v-if="item.email && !item.emailVerified" class="unverified">{{ text.unverified }}</span>
          <a v-if="item.phone" :href="'tel:' + item.phone" class="phone">{{ item.phone }}</a>
          <span>{{ format(text.lastSeen, { name: day(item.lastSeen) }) }}</span>
          <span v-if="item.updatedBy">{{ format(text.changedBy, { name: item.updatedBy }) }}</span>
        </div>
      </div>

      <v-select
        :model-value="item.role"
        :items="roleItems"
        :disabled="item.uid === user.uid || saving === item.uid"
        :loading="saving === item.uid"
        :aria-label="item.name || item.email || item.uid"
        density="compact"
        hide-details
        class="role-select"
        @update:model-value="change(item, { role: $event })"
      />

      <v-select
        :model-value="(item.ministries ?? []).filter((ministry) => ministries.includes(ministry))"
        :items="ministries"
        :label="text.sectionMinistries"
        :disabled="saving === item.uid"
        multiple
        chips
        closable-chips
        density="compact"
        hide-details
        class="ministries-select"
        @update:model-value="change(item, { ministries: $event })"
      />

      <ButtonTooltip
        icon="mdi-cellphone-cog"
        :text="header.myPhone"
        color="secondary"
        small
        @click="phoneOf = item"
      />

      <ConfirmButton
        v-if="item.uid !== user.uid"
        icon="mdi-account-remove-outline"
        :text="text.remove"
        @confirm="remove(item)"
      />
      <span v-else class="remove-placeholder" />
    </div>

    <PhoneDialog
      :model-value="Boolean(phoneOf)"
      :number="phoneOf?.phone ?? null"
      :title="phoneOf ? phoneOf.name || phoneOf.email || phoneOf.uid : ''"
      :submit="(phone: string) => change(phoneOf!, { phone })"
      @update:model-value="(value: boolean) => value || (phoneOf = null)"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import ConfirmButton from '@/components/ConfirmButton.vue'
import PhoneDialog from '@/components/PhoneDialog.vue'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import { READER, useWorkerStore, type Role, type RoleDef, type UserView } from '@/stores/worker'
import { format } from '@/utils/format'

/** The ministers: their role, ministries and phone; the readers only on request (to make one a minister) */
const props = defineProps<{ roles: RoleDef[]; ministries: string[] }>()
const emit = defineEmits<{ error: [cause: unknown] }>()

const worker = useWorkerStore()
const user = useUserStore()
const { admin: text, header } = storeToRefs(useLanguageStore())

const users = shallowRef<UserView[]>([])
const query = ref('')
const readers = ref(false)
const busy = ref(false)
const saving = ref<string | null>(null)
/** the user whose mobile number is being entered */
const phoneOf = shallowRef<UserView | null>(null)

const roleItems = computed(() => props.roles.map((role) => ({ value: role.id, title: role.name })))

/** a removed role counts as the reader */
const isReader = (item: UserView) =>
  item.role === READER || !props.roles.some((role) => role.id === item.role)

const shown = computed(() => {
  const words = (query.value ?? '').trim().toLowerCase()
  return users.value
    .filter((item) => readers.value || !isReader(item))
    .filter((item) => !words || `${item.name ?? ''} ${item.email ?? ''}`.toLowerCase().includes(words))
})

const day = (ms: number) => new Date(ms).toLocaleDateString()

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

async function change(item: UserView, update: { role?: Role; ministries?: string[]; phone?: string | null }) {
  saving.value = item.uid
  await run(async () => {
    const updated = await worker.updateUser(item.uid, update)
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
defineExpose({ load })
</script>

<style scoped>
.search {
  flex: 1 1 240px;
  max-width: 420px;
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

.phone {
  color: rgb(var(--v-theme-secondary));
  text-decoration: none;
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

.remove-placeholder {
  width: 40px;
}
</style>
