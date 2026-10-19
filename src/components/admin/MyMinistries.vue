<template>
  <section>
    <h2 class="admin-title">{{ text.sectionMyMinistries }}</h2>
    <p class="hint">{{ text.myMinistriesHint }}</p>

    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />
    <!-- a ministry the user leads: its roles and their people -->
    <article v-for="(roles, ministry) of ministryRoles" :key="ministry" class="ministry">
      <h3 class="ministry-name">{{ ministry }}</h3>
      <MinistryRolesEditor
        :roles="roles"
        :people="schedule.people"
        :disabled="saving"
        leader
        @save="(list: MinistryRole[]) => save(String(ministry), list)"
      />
    </article>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'

import MinistryRolesEditor from '@/components/admin/MinistryRolesEditor.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore } from '@/stores/schedule'
import { useWorkerStore, type MinistryRole, type MinistryRoles } from '@/stores/worker'

/**
 * The ministries the user leads: the leader gives the roles there to its people (the leaders
 * themselves are given by the administrators, in the section of the ministries)
 */
const emit = defineEmits<{ error: [cause: unknown] }>()

const worker = useWorkerStore()
const schedule = useScheduleStore()
const { admin: text } = storeToRefs(useLanguageStore())

const ministryRoles = ref<MinistryRoles>({})
const busy = ref(false)
const saving = ref(false)

onMounted(async () => {
  busy.value = true
  try {
    const [roles] = await Promise.all([worker.getLeaderRoles(), schedule.loadChoices()])
    ministryRoles.value = roles
  } catch (cause) {
    emit('error', cause)
  } finally {
    busy.value = false
  }
})

async function save(ministry: string, list: MinistryRole[]) {
  saving.value = true
  try {
    ministryRoles.value = { ...ministryRoles.value, [ministry]: await worker.setRolesOf(ministry, list) }
  } catch (cause) {
    emit('error', cause)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.hint {
  color: var(--app-text-muted);
  font-size: 14px;
  margin-bottom: 12px;
}

.ministry {
  margin-bottom: 24px;
}

.ministry-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}
</style>
