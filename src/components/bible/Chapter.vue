<template>
  <div class="mx-auto pb-16" style="max-width: 960px">
    <table class="chapter">
      <tbody>
        <tr v-for="(item, index) of content.chapterContent ?? []" :key="item._id">
          <td>
            <span :class="item._id === content.verseId ? 'line-number--emph' : 'line-number--normal'">
              {{ index + 1 }}
            </span>
          </td>
          <td>
            <p
              :id="item._id"
              :class="{ 'line-text--emph': item._id === content.verseId }"
              :style="content.cursorStyle"
              @click.stop="openVerse(item)"
              v-html="item.html || escape(item.verse)"
            />
          </td>
          <td v-if="user.signed">
            <LineActions :line-ref="item._id" />
          </td>
        </tr>
      </tbody>
    </table>

    <!-- a translation read online: the notice its license asks to show with the text -->
    <p v-if="content.remoteNotice" class="remote-notice">{{ content.remoteNotice }}</p>

    <LineDetails v-model="details" />

    <div v-if="user.signed" class="highlighter-bar">
      <v-btn-toggle v-model="marker" mandatory density="comfortable" bg-color="#ddd" class="elevation-4">
        <v-btn v-for="color of colors" :key="color" :value="color">
          <Highlighter :color="color" />
        </v-btn>
        <v-btn :value="null">
          <v-icon size="large" color="#999">mdi-close</v-icon>
        </v-btn>
      </v-btn-toggle>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useGoTo } from 'vuetify'

import Highlighter, {
  cursorFor,
  highlightColors,
  type HighlighterColor
} from '@/components/bible/Highlighter.vue'
import LineActions from '@/components/bible/LineActions.vue'
import LineDetails from '@/components/bible/LineDetails.vue'
import { cursor as cursorTemplate } from '@/configs'
import { useContentStore } from '@/stores/content'
import { useUserStore } from '@/stores/user'
import type { Verse } from '@/types'

const content = useContentStore()
const user = useUserStore()
const goTo = useGoTo()

const colors: HighlighterColor[] = ['magenta', 'yellow', 'cyan', 'green']
const marker = ref<HighlighterColor | null>(null)
const details = ref(false)

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** While a highlighter is chosen, every text selection in the chapter gets painted */
async function onSelectionDone() {
  clearTimeout(settleTimer)
  await content.selectionChange()
  document.getSelection()?.removeAllRanges()
}

/*
 * A mouse paints when its button is let go. On a phone the text is selected by a long press and then
 * by dragging the handles, and none of it ends with a touch event of the page (Android even cancels it),
 * so there the selection is painted once it has stopped changing for a moment.
 * The mouse is told by the pointer events: a phone also sends mouse events of its own (a mousedown
 * after a long press with no mouseup), which would wait for a button that is never let go.
 */
const SETTLE = 800
let settleTimer: ReturnType<typeof setTimeout> | undefined
let mouseSelecting = false

const byMouse = (event: Event) => (event as PointerEvent).pointerType === 'mouse'

function onPointerDown(event: Event) {
  mouseSelecting = byMouse(event)
}

function onPointerUp(event: Event) {
  if (!byMouse(event)) return
  mouseSelecting = false
  onSelectionDone()
}

function onPointerCancel() {
  mouseSelecting = false
}

function onSelectionChange() {
  if (mouseSelecting) return
  clearTimeout(settleTimer)
  settleTimer = setTimeout(onSelectionDone, SETTLE)
}

const listeners: Record<string, EventListener> = {
  pointerdown: onPointerDown,
  pointerup: onPointerUp,
  pointercancel: onPointerCancel,
  selectionchange: onSelectionChange
}

function setListeners(on: boolean) {
  for (const [name, listener] of Object.entries(listeners)) {
    if (on) document.addEventListener(name, listener)
    else document.removeEventListener(name, listener)
  }
  on || clearTimeout(settleTimer)
}

watch(marker, (color) => {
  setListeners(false)

  if (!color) return content.resetHighlighting()

  content.setCursor(cursorFor(color, cursorTemplate))
  content.setHighlightColor(highlightColors[color])
  setListeners(true)
})

/** Opens the keywords, topics and notes of the clicked verse */
async function openVerse(verse: Verse) {
  // a click that finishes a highlighting selection must not open the verse
  if (marker.value || !user.signed) return
  content.setCurrentVerse(verse)
  await content.getLineDetails(verse._id)
  details.value = true
}

/** Scrolls to the verse the user navigated to (from a note, topic or keyword) */
async function scrollToVerse() {
  const id = content.verseId
  if (!id) return
  await nextTick()
  const element = document.getElementById(id)
  element && goTo(element, { duration: 300, offset: -120, easing: 'easeInOutCubic' })
}

watch(() => content.chapterContent, scrollToVerse)

onMounted(() => content.getChapterContent())

onBeforeUnmount(() => {
  setListeners(false)
  content.resetHighlighting()
})
</script>

<style scoped>
.chapter {
  width: 100%;
  border-collapse: collapse;
}

.chapter td {
  vertical-align: middle;
  padding: 6px 0;
}

/* light separators make it clear which verse the action buttons belong to */
.chapter tr + tr td {
  border-top: solid 1px var(--app-border-light);
}

.chapter p {
  margin: 0;
}

.line-number--normal,
.line-number--emph {
  display: inline-block;
  min-width: 32px;
  margin: 0 8px 0 0;
  font-size: 11px;
  line-height: 1.6;
  border-radius: 4px;
  padding: 2px 4px;
  text-align: center;
  user-select: none;
}

.line-number--normal {
  border: solid 1px var(--app-border);
  color: var(--app-text-muted);
}

.line-number--emph {
  border: solid 2px rgb(var(--v-theme-secondary));
  font-weight: bold;
  background: rgb(var(--v-theme-secondary) / 73%);
  color: var(--app-secondary);
}

.line-text--emph {
  font-weight: bold;
  color: rgb(var(--v-theme-secondary));
}

.remote-notice {
  margin: 16px 8px 0;
  font-size: 12px;
  white-space: pre-line;
  color: var(--app-text-muted);
}

.highlighter-bar {
  position: fixed;
  bottom: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}
</style>
