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

        <p v-if="element.type !== 'note'" v-html="element.html" />

        <!-- a note shows its text; the verses and keywords open with the button on the right -->
        <template v-else>
          <div class="d-flex align-start">
            <p class="note-text flex-grow-1">{{ element.text }}</p>
            <v-btn
              v-if="element.verses.length || element.keywords.length"
              variant="text"
              size="small"
              color="secondary"
              class="note-toggle ml-2"
              prepend-icon="mdi-paperclip"
              :append-icon="expanded.has(element._id) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              :aria-expanded="expanded.has(element._id)"
              :aria-label="
                expanded.has(element._id)
                  ? text.hideVerses
                  : format(text.showVerses, { count: element.verses.length })
              "
              @click="toggle(element._id)"
            >
              {{ element.verses.length }}
            </v-btn>
          </div>

          <!-- an empty note stays a drop target while editing -->
          <NestedDraggable
            v-if="expanded.has(element._id) || (showControls && !element.verses.length)"
            :items="element.verses"
            kind="note"
            :show-controls="showControls"
            class="ml-3 ml-sm-5 ml-md-12"
            @remove="(verse: TopicItem) => emit('remove-from-note', element, verse)"
          />

          <div v-if="showControls || expanded.has(element._id)" class="d-flex align-center flex-wrap mt-1">
            <ConfirmButton
              v-if="showControls"
              icon="$removeTopic"
              :text="text.removeFromTopicTooltip"
              @confirm="emit('remove', element)"
            />
            <v-spacer />
            <template v-if="expanded.has(element._id)">
              <v-chip
                v-for="keyword of element.keywords"
                :key="keyword"
                size="small"
                variant="tonal"
                class="ma-1"
              >
                #{{ keyword }}
              </v-chip>
            </template>
          </div>
        </template>
      </div>
    </template>
  </draggable>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import draggable from 'vuedraggable'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import ConfirmButton from '@/components/ConfirmButton.vue'
import DialogToUpdateNote from '@/components/notes/DialogToUpdateNote.vue'
import { useLanguageStore } from '@/stores/language'
import type { TopicItem, TopicNoteItem } from '@/stores/topics'
import type { Note } from '@/types'
import { format } from '@/utils/format'

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

/** ids of the notes whose verses are open; all are closed at first */
const expanded = ref(new Set<string>())

function toggle(id: string) {
  const next = new Set(expanded.value)
  if (!next.delete(id)) next.add(id)
  expanded.value = next
}

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
  margin-bottom: 0;
}

.note-toggle {
  flex-shrink: 0;
  margin-top: -4px;
}
</style>
