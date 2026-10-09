<template>
  <ButtonTooltip icon="$delete" color="delete" small class="delete-icon" :text="tooltip" @click="ask" />

  <v-dialog v-model="open" max-width="440">
    <v-card color="homefone" class="pa-2">
      <v-card-title class="text-subtitle-1 font-weight-bold text-wrap">
        {{ format(common.deleteConfirm, { name }) }}
      </v-card-title>

      <v-card-text v-if="count">
        <v-alert type="warning" variant="tonal" density="compact">
          {{ format(common.linkedNotes, { name, count }) }}
        </v-alert>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="open = false">{{ common.cancel }}</v-btn>
        <v-btn variant="tonal" color="delete" prepend-icon="$delete" @click="confirm">{{
          common.delete
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
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
