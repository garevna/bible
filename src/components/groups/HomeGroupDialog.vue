<template>
  <AppDialog v-model="open" :title="text.myGroup" icon="mdi-home-account" max-width="560">
    <p class="hint">{{ text.myGroupHint }}</p>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>

    <!-- found by the leader, the day or the place -->
    <v-autocomplete
      v-model="chosen"
      :items="items"
      :loading="busy"
      :label="text.myGroup"
      :no-data-text="text.none"
      item-title="title"
      item-value="value"
      :custom-filter="matches"
      prepend-inner-icon="$search"
      clearable
      density="compact"
    >
      <template #item="{ props: item, item: { raw } }">
        <v-list-item v-bind="item" :subtitle="raw.subtitle" />
      </template>
    </v-autocomplete>

    <template #actions>
      <DialogButtons :confirm-text="common.save" :disabled="busy" @cancel="open = false" @confirm="save" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import { groupTitle, meetsText, useGroupsStore } from '@/stores/groups'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import { useWorkerStore, WorkerError } from '@/stores/worker'
import { localeOf } from '@/utils/dates'

/** The home group of the user: one of the groups, found by its leader, its day or its place */
const open = defineModel<boolean>({ default: false })

const worker = useWorkerStore()
const groups = useGroupsStore()
const user = useUserStore()
const { groups: text, common, publish } = storeToRefs(useLanguageStore())

const chosen = ref<string | null>(null)
const busy = ref(false)
const error = ref('')

watch(open, async (value) => {
  if (!value) return
  chosen.value = worker.homeGroupId
  error.value = ''
  busy.value = true
  try {
    await groups.load()
  } catch (cause) {
    error.value = reason(cause)
  } finally {
    busy.value = false
  }
})

/** the leader; when and where */
const items = computed(() =>
  groups.groups.map((group) => ({
    value: group.id,
    title: groupTitle(group),
    subtitle: [meetsText(group, localeOf(user.lang), text.value.notSet), group.address]
      .filter(Boolean)
      .join(' · ')
  }))
)

/** the words in the leader, the day or the address */
const matches = (_value: string, query: string, item?: { raw: { title: string; subtitle: string } }) =>
  !query || `${item?.raw.title} ${item?.raw.subtitle}`.toLowerCase().includes(query.toLowerCase())

const reason = (cause: unknown) =>
  cause instanceof WorkerError && cause.message !== 'unreachable' ? cause.message : publish.value.unreachable

async function save() {
  busy.value = true
  error.value = ''
  try {
    await worker.setHomeGroup(chosen.value ?? null)
    open.value = false
  } catch (cause) {
    error.value = reason(cause)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.hint {
  color: var(--app-text-muted);
  font-size: 14px;
  margin-bottom: 12px;
}
</style>
