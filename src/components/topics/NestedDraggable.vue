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
      <!-- no padding: the icons are pressed to the frame, the content has margins around it -->
      <div class="draggable-item topic-item mb-2">
        <!-- top: move on the left; edit (a note) or unlink (a verse) on the right -->
        <div v-if="showControls" class="d-flex align-center">
          <v-icon class="drag-handle" color="buttons" :aria-label="text.moveTooltip">$drag</v-icon>
          <v-spacer />
          <DialogToUpdateNote
            v-if="element.type === 'note'"
            :note="element"
            :tooltip="text.editNoteTooltip"
            @saved="emit('note-saved', element, $event)"
          />
          <ButtonTooltip
            v-else
            icon="$unlink"
            color="delete"
            small
            class="delete-icon"
            :text="kind === 'note' ? text.removeFromNoteTooltip : text.removeFromTopicTooltip"
            @click="emit('remove', element)"
          />
        </div>

        <p v-if="element.type !== 'note'" class="ma-5" v-html="element.html" />

        <template v-else>
          <!-- a note shows its text; the verses and keywords open with the button in the bottom right corner -->
          <div class="ma-5">
            <p class="note-text">{{ element.text }}</p>

            <!-- an empty note stays a drop target while editing -->
            <NestedDraggable
              v-if="expanded.has(element._id) || (showControls && !element.verses.length)"
              :items="element.verses"
              kind="note"
              :show-controls="showControls"
              class="mt-4 ml-3 ml-sm-5 ml-md-12"
              @remove="(verse: TopicItem) => emit('remove-from-note', element, verse)"
            />

            <div v-if="expanded.has(element._id) && element.keywords.length" class="d-flex flex-wrap mt-2">
              <v-chip
                v-for="keyword of element.keywords"
                :key="keyword"
                size="small"
                variant="tonal"
                class="ma-1"
              >
                #{{ keyword }}
              </v-chip>
            </div>
          </div>

          <!-- bottom: unlink from the topic on the left, the verses on the right -->
          <div v-if="showControls || hasContent(element)" class="d-flex align-center">
            <ConfirmButton
              v-if="showControls"
              icon="$unlink"
              :text="text.removeFromTopicTooltip"
              @confirm="emit('remove', element)"
            />
            <v-spacer />
            <v-btn
              v-if="hasContent(element)"
              variant="text"
              size="small"
              color="secondary"
              class="note-toggle"
              :aria-expanded="expanded.has(element._id)"
              :aria-label="
                expanded.has(element._id)
                  ? text.hideVerses
                  : format(text.showVerses, { count: element.verses.length })
              "
              @click="toggle(element._id)"
            >
              <v-badge
                :model-value="element.verses.length > 0"
                :content="element.verses.length"
                color="secondary"
                offset-x="-4"
                offset-y="-2"
              >
                <v-icon icon="$noteVerses" />
              </v-badge>
              <v-icon
                :icon="expanded.has(element._id) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                class="ml-4"
              />
            </v-btn>
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

const hasContent = (note: TopicNoteItem) => Boolean(note.verses.length || note.keywords.length)

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

/* the global .draggable-item padding is dropped: the icons are pressed to the frame */
.topic-item {
  padding: 0;
  cursor: default;
}

.drag-handle {
  cursor: grab;
  margin: 6px;
}

.note-text {
  white-space: pre-wrap;
  margin-bottom: 0;
}
</style>
