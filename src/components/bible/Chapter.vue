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
        </tr>
      </tbody>
    </table>

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
import { cursor as cursorTemplate } from '@/configs'
import { useContentStore } from '@/stores/content'
import { useUserStore } from '@/stores/user'
import type { Verse } from '@/types'

const emit = defineEmits<{ 'open-verse': [verse: Verse] }>()

const content = useContentStore()
const user = useUserStore()
const goTo = useGoTo()

const colors: HighlighterColor[] = ['magenta', 'yellow', 'cyan', 'green']
const marker = ref<HighlighterColor | null>(null)

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** While a highlighter is chosen, every text selection in the chapter gets painted */
async function onSelectionDone() {
  await content.selectionChange()
  document.getSelection()?.removeAllRanges()
}

function setListeners(on: boolean) {
  const method = on ? 'addEventListener' : 'removeEventListener'
  document[method]('mouseup', onSelectionDone)
  document[method]('touchend', onSelectionDone)
}

watch(marker, (color) => {
  setListeners(false)

  if (!color) return content.resetHighlighting()

  content.setCursor(cursorFor(color, cursorTemplate))
  content.setHighlightColor(highlightColors[color])
  setListeners(true)
})

function openVerse(verse: Verse) {
  // a click that finishes a highlighting selection must not open the verse
  if (marker.value) return
  emit('open-verse', verse)
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
.chapter td {
  vertical-align: top;
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
  border: solid 1px #ddd;
  color: #999;
}

.line-number--emph {
  border: solid 2px #09b;
  font-weight: bold;
  background: #09bb;
  color: #eef;
}

.line-text--emph {
  font-weight: bold;
  color: #09b;
}

.highlighter-bar {
  position: fixed;
  bottom: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}
</style>
