<template>
  <draggable
    :list="items"
    item-key="_id"
    group="topic-items"
    :data-kind="kind"
    :move="canMove"
    :animation="200"
    :swap-threshold="0.65"
    :fallback-on-body="true"
    :disabled="!showControls"
    handle=".drag-handle"
    ghost-class="drop-placeholder"
    chosen-class="chosen-item"
    drag-class="dragging-item"
    :class="['nested-list', { 'nested-list--note': kind === 'note' }]"
  >
    <template #item="{ element }">
      <div class="draggable-item mb-2">
        <div v-if="showControls" class="d-flex align-center">
          <v-icon class="drag-handle mr-2" color="buttons">$drag</v-icon>
          <v-spacer />
          <DialogToUpdateNote
            v-if="element.type === 'note'"
            :note="element"
            :tooltip="text.editNoteTooltip"
            @saved="emit('note-saved', element, $event)"
          />
          <ButtonTooltip
            v-else
            :icon="kind === 'note' ? '$remove' : '$removeTopic'"
            color="delete"
            small
            class="delete-icon"
            :text="kind === 'note' ? text.removeFromNoteTooltip : text.removeFromTopicTooltip"
            @click="emit('remove', element)"
          />
        </div>

        <p v-if="element.type === 'note'" class="note-text">{{ element.text }}</p>
        <p v-else v-html="element.html" />

        <template v-if="element.type === 'note'">
          <NestedDraggable
            :items="element.verses"
            kind="note"
            :show-controls="showControls"
            class="ml-3 ml-sm-5 ml-md-12"
            @remove="(verse: TopicItem) => emit('remove-from-note', element, verse)"
          />

          <div class="d-flex align-center flex-wrap mt-1">
            <ConfirmButton
              v-if="showControls"
              icon="$removeTopic"
              :text="text.removeFromTopicTooltip"
              @confirm="emit('remove', element)"
            />
            <v-spacer />
            <v-chip v-for="keyword of element.keywords" :key="keyword" size="small" color="#999" class="ma-1">
              #{{ keyword }}
            </v-chip>
          </div>
        </template>
      </div>
    </template>
  </draggable>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import draggable from 'vuedraggable'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import ConfirmButton from '@/components/ConfirmButton.vue'
import DialogToUpdateNote from '@/components/notes/DialogToUpdateNote.vue'
import { useLanguageStore } from '@/stores/language'
import type { TopicItem, TopicNoteItem } from '@/stores/topics'
import type { Note } from '@/types'

/**
 * Items of a topic (kind = 'topic') or the verses of a note inside it (kind = 'note').
 * Verses can be moved between the topic and its notes, notes only within the topic.
 * The lists are changed in place; the topic page saves them.
 */
withDefaults(defineProps<{ items: TopicItem[]; kind?: 'topic' | 'note'; showControls?: boolean }>(), {
  kind: 'topic',
  showControls: true
})

const emit = defineEmits<{
  remove: [item: TopicItem]
  'remove-from-note': [note: TopicNoteItem, verse: TopicItem]
  'note-saved': [item: TopicNoteItem, note: Note]
}>()

const { nestedDraggable: text } = storeToRefs(useLanguageStore())

const allowedTargets: Record<TopicItem['type'], string[]> = {
  verse: ['topic', 'note'],
  note: ['topic']
}

function canMove(event: { to: HTMLElement; draggedContext: { element: TopicItem } }) {
  const target = event.to.dataset.kind ?? ''
  return allowedTargets[event.draggedContext.element.type].includes(target)
}
</script>

<style scoped>
.nested-list--note {
  min-height: 24px;
}

.drag-handle {
  cursor: grab;
}

.note-text {
  white-space: pre-wrap;
}
</style>
