<template>
  <div class="ministry-roles">
    <p class="label">{{ text.ministryRoles }}</p>
    <p class="hint">{{ text.ministryRolesHint }}</p>

    <!-- a role: its name, its rights and its people; each change is saved at once, the name by its icon -->
    <article v-for="role of roles" :key="role.id" class="role">
      <!-- a leader sees the roles that lead, as the administrators gave them -->
      <div class="d-flex align-center ga-2">
        <v-text-field
          :model-value="names[role.id] ?? role.name"
          :label="text.ministryRoleName"
          :disabled="disabled || fixed(role)"
          :append-inner-icon="renamed(role) ? 'mdi-content-save-outline' : undefined"
          density="compact"
          hide-details
          @update:model-value="(value: string) => (names[role.id] = value)"
          @click:append-inner="rename(role)"
          @keydown.enter="rename(role)"
        />
        <ConfirmButton
          v-if="!fixed(role)"
          icon="$unlink"
          :text="`${text.removeMinistryRole}: ${role.name}`"
          @confirm="save(roles.filter((item) => item.id !== role.id))"
        />
      </div>

      <v-chip-group
        :model-value="RIGHTS.filter((right) => role[right])"
        multiple
        column
        selected-class="text-secondary"
        :disabled="disabled || fixed(role)"
        @update:model-value="(chosen: unknown) => setRights(role, chosen as Right[])"
      >
        <v-chip
          v-for="right of RIGHTS.filter(
            (item) => !leader || !['lead', 'deputy'].includes(item) || role[item]
          )"
          :key="right"
          :value="right"
          size="small"
          variant="outlined"
          filter
        >
          {{ rightNames[right] }}
        </v-chip>
      </v-chip-group>

      <v-autocomplete
        :model-value="role.uids"
        :items="people"
        item-title="name"
        item-value="uid"
        :label="text.ministryRolePeople"
        :disabled="disabled || fixed(role)"
        multiple
        chips
        closable-chips
        density="compact"
        hide-details
        @update:model-value="
          (uids: string[]) => save(roles.map((item) => (item.id === role.id ? { ...item, uids } : item)))
        "
      />
    </article>

    <v-text-field
      v-model="newRole"
      :label="text.newMinistryRole"
      :disabled="disabled"
      append-inner-icon="mdi-plus-thick"
      density="compact"
      hide-details
      class="new-role"
      @click:append-inner="add"
      @keydown.enter="add"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'

import ConfirmButton from '@/components/ConfirmButton.vue'
import { useLanguageStore } from '@/stores/language'
import type { MinistryRole } from '@/stores/worker'

/**
 * The roles inside one ministry ("Лідер служіння", "Музикант", "Публікатор"…): what each lets its people
 * do there, and who they are. The list goes back whole on every change.
 */
const props = defineProps<{
  roles: MinistryRole[]
  people: { uid: string; name: string }[]
  disabled?: boolean
  /** a leader of the ministry: the roles that lead are given by the administrators */
  leader?: boolean
}>()
const emit = defineEmits<{ save: [roles: MinistryRole[]] }>()

const { admin: text } = storeToRefs(useLanguageStore())

const RIGHTS = ['lead', 'deputy', 'invite', 'approve', 'publish', 'send'] as const
type Right = (typeof RIGHTS)[number]

const rightNames = computed<Record<Right, string>>(() => ({
  lead: text.value.ministryRightLead,
  deputy: text.value.ministryRightDeputy,
  invite: text.value.ministryRightInvite,
  approve: text.value.ministryRightApprove,
  publish: text.value.ministryRightPublish,
  send: text.value.ministryRightSend
}))

const save = (roles: MinistryRole[]) => emit('save', roles)
/** a leader sees the roles of the leaders and of their deputies as the administrators gave them */
const fixed = (role: MinistryRole) => Boolean(props.leader && (role.lead || role.deputy))

function setRights(role: MinistryRole, chosen: Right[]) {
  const rights = Object.fromEntries(RIGHTS.map((right) => [right, chosen.includes(right)]))
  save(props.roles.map((item) => (item.id === role.id ? { ...item, ...rights } : item)))
}

/** the names being written, by role */
const names = reactive<Record<string, string>>({})
const renamed = (role: MinistryRole) => {
  const name = (names[role.id] ?? role.name).trim()
  return Boolean(name) && name !== role.name
}
function rename(role: MinistryRole) {
  if (!renamed(role)) return
  const name = names[role.id]!.trim()
  delete names[role.id]
  save(props.roles.map((item) => (item.id === role.id ? { ...item, name } : item)))
}

const newRole = ref('')
/** a new role: no rights yet, nobody in it */
function add() {
  const name = (newRole.value ?? '').trim()
  if (!name || props.roles.some((role) => role.name === name)) return
  const id = `r-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  save([
    ...props.roles,
    {
      id,
      name,
      lead: false,
      deputy: false,
      invite: false,
      approve: false,
      publish: false,
      send: false,
      uids: []
    }
  ])
  newRole.value = ''
}
</script>

<style scoped>
.ministry-roles {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-weight: 600;
}

.hint {
  color: var(--app-text-muted);
  font-size: 13px;
}

.role {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface);
}

.new-role {
  max-width: 420px;
}
</style>
