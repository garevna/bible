<template>
  <section>
    <h2 class="admin-title">{{ text.sectionRoles }}</h2>
    <p class="hint">{{ text.rolesHint }}</p>

    <!-- each role opens its rights -->
    <v-expansion-panels v-model="opened" variant="accordion" class="mb-4">
      <v-expansion-panel
        v-for="role of draft"
        :key="role.id"
        :value="role.id"
        elevation="0"
        class="role-panel"
      >
        <v-expansion-panel-title>
          <span class="flex-grow-1 font-weight-bold">{{ role.name || text.newRole }}</span>
          <ConfirmButton
            v-if="role.id !== READER"
            icon="$unlink"
            :text="`${text.removeRole}: ${text.removeRoleHint}`"
            class="mr-2"
            @confirm="remove(role)"
          />
        </v-expansion-panel-title>

        <v-expansion-panel-text>
          <p v-if="role.id === READER" class="hint">{{ text.readerFixed }}</p>
          <template v-else>
            <v-text-field v-model="role.name" :label="text.roleName" density="compact" class="mb-2" />
            <v-switch
              v-model="role.publish"
              :label="text.rightPublish"
              color="secondary"
              density="compact"
              hide-details
            />
            <v-switch
              v-model="role.send"
              :label="text.rightSend"
              color="secondary"
              density="compact"
              hide-details
            />

            <div v-if="role.send" class="ml-4 mb-2">
              <p class="label">{{ text.rightSendToRoles }}</p>
              <div class="d-flex flex-wrap">
                <v-checkbox
                  v-for="target of targets"
                  :key="target.id"
                  v-model="role.sendToRoles"
                  :value="target.id"
                  :label="target.name"
                  color="secondary"
                  density="compact"
                  hide-details
                  class="mr-4"
                />
              </div>
              <v-checkbox
                v-model="role.sendToPeople"
                :label="text.rightSendToPeople"
                color="secondary"
                density="compact"
                hide-details
              />
              <v-text-field
                v-model.number="role.messageDays"
                :label="text.rightMessageDays"
                type="number"
                min="1"
                max="30"
                density="compact"
                class="days mt-2"
              />
            </div>
            <v-switch
              v-model="role.approve"
              :label="text.rightApprove"
              color="secondary"
              density="compact"
              hide-details
            />

            <!-- the ministries whose events its people invite to -->
            <p class="label mt-2">{{ text.rightInvite }}</p>
            <v-checkbox
              :model-value="role.invite.includes(ANY_MINISTRY)"
              :label="text.inviteAny"
              color="secondary"
              density="compact"
              hide-details
              @update:model-value="(any: boolean | null) => (role.invite = any ? [ANY_MINISTRY] : [])"
            />
            <div v-if="!role.invite.includes(ANY_MINISTRY)" class="d-flex flex-wrap ga-x-4 ml-6">
              <v-checkbox
                v-for="ministry of ministries"
                :key="ministry"
                v-model="role.invite"
                :value="ministry"
                :label="ministry"
                color="secondary"
                density="compact"
                hide-details
                class="flex-grow-0"
              />
            </div>

            <p class="label mt-2">{{ text.rightManage }}</p>
            <v-checkbox
              v-for="item of manageItems"
              :key="item.value"
              v-model="role.manage"
              :value="item.value"
              :label="item.title"
              color="secondary"
              density="compact"
              hide-details
            />
          </template>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <div class="d-flex flex-wrap align-center ga-2">
      <v-btn variant="tonal" color="buttons" class="text-none" prepend-icon="$link" @click="add">
        {{ text.addRole }}
      </v-btn>
      <v-spacer />
      <span v-if="dirty" class="text-warning text-body-2">{{ text.unsaved }}</span>
      <v-btn
        variant="flat"
        color="primary"
        class="text-none px-6"
        :disabled="!dirty || busy"
        :loading="busy"
        @click="save"
      >
        {{ text.saveRoles }}
      </v-btn>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import ConfirmButton from '@/components/ConfirmButton.vue'
import { useLanguageStore } from '@/stores/language'
import { ANY_MINISTRY, MANAGE, READER, useWorkerStore, type Manage, type RoleDef } from '@/stores/worker'

/** The roles and what their people may do; the changes are saved together */
const roles = defineModel<RoleDef[]>({ required: true })
defineProps<{ ministries: string[] }>()
const emit = defineEmits<{ error: [cause: unknown] }>()

const worker = useWorkerStore()
const { admin: text } = storeToRefs(useLanguageStore())

const copy = (list: RoleDef[]) =>
  list.map((role) => ({
    ...role,
    sendToRoles: [...role.sendToRoles],
    invite: [...(role.invite ?? [])],
    manage: [...role.manage]
  }))
const draft = ref<RoleDef[]>(copy(roles.value))
watch(roles, (value) => (draft.value = copy(value)))

const opened = ref<string | null>(null)
const busy = ref(false)
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(roles.value))

/** the roles one may write to: all but the reader */
const targets = computed(() => draft.value.filter((role) => role.id !== READER))

const manageLabels: Record<Manage, keyof typeof text.value> = {
  roles: 'manageRoles',
  users: 'manageUsers',
  directories: 'manageDirectories',
  types: 'manageTypes',
  schedule: 'manageSchedule'
}
const manageItems = computed(() => MANAGE.map((value) => ({ value, title: text.value[manageLabels[value]] })))

function add() {
  const id = `role-${Date.now().toString(36)}`
  draft.value.push({
    id,
    name: text.value.newRole,
    publish: false,
    send: false,
    sendToRoles: [],
    sendToPeople: false,
    messageDays: 1,
    approve: false,
    invite: [],
    manage: []
  })
  opened.value = id
}

function remove(role: RoleDef) {
  draft.value = draft.value
    .filter((item) => item.id !== role.id)
    .map((item) => ({ ...item, sendToRoles: item.sendToRoles.filter((id) => id !== role.id) }))
}

async function save() {
  busy.value = true
  try {
    roles.value = await worker.setRoles(
      draft.value.map((role) => ({
        ...role,
        messageDays: Math.min(30, Math.max(1, Number(role.messageDays) || 1))
      }))
    )
  } catch (cause) {
    emit('error', cause)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.role-panel {
  border: solid 1px var(--app-border);
  margin-bottom: 4px;
  border-radius: var(--app-radius) !important;
}

.label {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 4px 0 0;
}

.days {
  max-width: 360px;
}
</style>
