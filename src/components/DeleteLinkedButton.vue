<template>
  <ButtonTooltip
    icon="$delete-filled"
    color="delete"
    small
    class="delete-icon"
    :text="tooltip"
    @click="ask"
  />

  <AppDialog v-model="open" :title="format(common.deleteConfirm, { name })" icon="$delete" max-width="460">
    <v-alert v-if="count" type="warning" variant="tonal" density="compact">
      {{ format(common.linkedNotes, { name, count }) }}
    </v-alert>
    <p v-else class="my-0">{{ common.cannotUndo }}</p>

    <template #actions>
      <DialogButtons :confirm-text="common.delete" danger @cancel="open = false" @confirm="confirm" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'
import { format } from '@/utils/format'

/** Deletes a topic or keyword after a confirmation that tells how many notes link to it */
const props = defineProps<{ name: string; id: string; field: 'topics' | 'keywords'; tooltip?: string }>()
const emit = defineEmits<{ confirm: [] }>()

const notes = useNotesStore()
const { common } = storeToRefs(useLanguageStore())

const open = ref(false)
const count = ref(0)

async function ask() {
  count.value = await notes.countLinkedNotes(props.field, props.id)
  open.value = true
}

function confirm() {
  open.value = false
  emit('confirm')
}
</script>
