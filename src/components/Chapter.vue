<template>
  <v-card flat class="transparent mx-auto my-8" max-width="960" v-if="ready">
    <v-toolbar flat class="transparent">
      <v-spacer />
      <v-btn-toggle
        v-if="$root.user"
        v-model="toggle"
        mandatory
        dense
        active-class="active-highlighter"
      >
        <v-btn style="padding-top: 8px;">
          <Highlighter color="magenta" />
        </v-btn>
        <v-btn style="padding-top: 8px;">
          <Highlighter color="yellow" />
        </v-btn>
        <v-btn style="padding-top: 8px;">
          <Highlighter color="cyan" />
        </v-btn>
        <v-btn style="padding-top: 8px;">
          <Highlighter color="green" />
        </v-btn>
        <v-btn>
          <v-icon large color="#999" @click="resetHighlightning">
            mdi-close
          </v-icon>
        </v-btn>
      </v-btn-toggle>
    </v-toolbar>

    <v-data-table
      :headers="headers"
      :items="chapterContent"
      item-key="line"
      sort-by="line"
      class="transparent"
      calculate-widths
      :items-per-page="-1"
      :caption="`Розділ ${chapter}`"
      hide-default-header
      hide-default-footer
      @click:row="showDetails($event)"
    >
      <template v-slot:item.line="{ item }">
        <sup :id="item._id" :class="item._id === verseId ? 'line-number--emph' : 'line-number--normal'">
          {{ item.line + 1 }}
        </sup>
      </template>

      <template v-slot:item.text="{ item }">
        <span
          :id="item.line"
          v-html="getHTML(item.line)"
          :style="cursorStyle"
        />
      </template>

      <template v-slot:item.actions="{ item }">
        <LineActions
          v-if="$root.user"
          :lineRef="item._id"
          :activeRef.sync="activeRef"
        />
      </template>
    </v-data-table>

    <DropdownMenu
      :showMenu.sync="showMenu"
      :event.sync="event"
      :selected.sync="option"
      :menuItems="menuItems"
    />
  </v-card>
</template>

<script>

import Highlighter from '@/assets/Highlighter.vue'

import DropdownMenu from '@/components/DropdownMenu.vue'
import LineActions from '@/components/LineActions.vue'

import { selectionChange } from '@/helpers'
import { menuItems } from '@/configs'

export default {
  name: 'Chapter',

  components: {
    Highlighter,
    DropdownMenu,
    LineActions
  },

  props: ['covenantIndex', 'bookIndex', 'chapter'],

  data: () => ({
    viewportWidth: window.innerWidth,
    cursorStyle: 'default',
    highlightColor: '#0000',
    toggle: 4,
    chapterContent: null,
    lineRef: '',
    verseId: null,
    ready: false,
    menuItems,
    showMenu: false,
    option: null,
    event: {},
    headers: [
      { text: '', align: 'start', justify: 'end', sortable: false, value: 'line', width: '32px' },
      { text: '', align: 'start', justify: 'start', sortable: false, value: 'text' },
      { text: '', sortable: false, value: 'actions', width: 240 }
    ],

    activeRef: null
  }),

  watch: {
    toggle (val) {
      if (val === 4) this.resetHighlightning()
      else this.setListeners()
    },

    async bookIndex (val) {
      await this.getChapterContent()
    },

    chapter (val) {
      this.getChapterContent()
    },

    option (val) {
      this.keywordClicked = val === 'keywords' ? this.lineRef : null
      this.noteClicked = val === 'notes' ? this.lineRef : null
      this.topicClicked = val === 'topics' ? this.lineRef : null
    },

    ready: {
      immediate: true,
      handler (val) {
        if (!val) return
        localStorage.setItem('chapter', this.chapter)

        this.$nextTick(() => {
          const elem = this.verseId && document.getElementById(this.verseId)
          elem && this.$vuetify.goTo(elem, {
            duration: 300,
            offset: 100,
            easing: 'easeInOutCubic'
          })
        })
      }
    }
  },

  methods: {
    selectionChange,
    getBookChapter: () => null,
    getChapterRef: () => null,
    getChapterHighlights: () => null,

    showDetails (item) {
      if (this.cursorStyle !== 'default') return
      Object.assign(this, { activeRef: item._id })
    },

    async getChapterContent () {
      this.ready = false

      this.chapterContent = await this.getBookChapter(this.covenantIndex, this.bookIndex, Math.max(this.chapter - 1, 0))
      const chapterRef = this.getChapterRef(this.covenantIndex, this.bookIndex, this.chapter - 1)
      const highlights = await this.getChapterHighlights(chapterRef)

      highlights.forEach(marker => {
        const verse = this.chapterContent.find(record => record._id === marker._id)
        verse && Object.assign(verse, { colored: marker.colored })
      })

      this.ready = true
    },

    selectOption (event, item) {
      Object.assign(this, { lineRef: item._id })
      this.event = {
        x: event.clientX,
        y: event.clientY,
        show: true
      }
      this.showMenu = true
    },

    resize () {
      this.viewportWidth = window.innerWidth
    },

    changeMarker (marker) {
      this.cursorStyle = `cursor: url('${marker.cursor}'), auto`
      this.highlightColor = marker.color
    },

    getPosition (sourceText, fragment) {
      const start = sourceText.indexOf(fragment)
      return [start, start + fragment.length - 1]
    },

    getHTML (index) {
      if (!this.chapterContent[index].colored) return this.chapterContent[index].text
      let html = this.chapterContent[index].text
      for (const item of this.chapterContent[index].colored) {
        const text = this.chapterContent[index].text.slice(item.start, item.end + 1)
        html = html
          .split(text)
          .join(text ? `<span style="background: ${item.color}">${text}</span>` : '')
      }

      return html
    },

    resetHighlightning () {
      this.cursorStyle = 'default'
      this.highlightColor = '#0000'
      this.clearListeners()
    },

    resetSelection () {
      const marker = {
        cursorStyle: this.cursorStyle,
        highlightColor: this.highlightColor
      }
      this.resetHighlightning()
      this.$nextTick(() => {
        Object.assign(this, marker)
        document.getSelection().empty()
        this.cursorStyle !== 'default' && this.setListeners()
      })
    },

    setMouseButtonState (event) {
      if (this.cursorStyle === 'default') return
      if (event.type !== 'mousemove' && event.buttons === 0) {
        this.selectionChange()
        this.resetSelection()
      }
    },

    setListeners () {
      ['mousedown', 'mousemove', 'mouseup']
        .forEach(event => document.addEventListener(event, this.setMouseButtonState))
    },

    clearListeners () {
      ['mousedown', 'mousemove', 'mouseup']
        .forEach(event => document.removeEventListener(event, this.setMouseButtonState))
    }
  },

  async created () {
    console.log('CHAPTER: ', this.chapter)

    const {
      getBookChapter,
      getChapterRef,
      getChapterHighlights
    } = this.$root.contentController

    Object.assign(this, { getBookChapter, getChapterRef, getChapterHighlights })
    await this.getChapterContent()
    this.ready = true
  },

  mounted () {
    this.verseId = localStorage.getItem('verse')

    this.$root.$on('resize', this.resize)
    this.$root.$on('marker-changed', this.changeMarker)
  },

  beforeDestroy () {
    this.clearListeners()
    this.$root.$off('resize', this.resize)
    this.$root.$off('marker-changed', this.changeMarker)
  }
}
</script>

<style>

.v-pagination__item {
  box-shadow: none !important;
  border: solid 1px #ddd;
  font-size: 13px;
}

.v-pagination__navigation {
  box-shadow: none !important;
}
</style>

<style scoped>

.line-number, .line-text {
  font-family: monospace, Arial, sans-serif;
  font-size: 13px;
  margin: 0;
}

.line-number--normal,
.line-number--emph {
  margin: 0 8px 0 0;
  border-radius: 4px;
  padding: 4px 4px 4px 8px;
  text-align: center;
  user-select: none;
}

.line-number--normal {
  border: solid 1px #ddd;
  font-weight: normal;
  color: #999;
}

.line-number--emph {
  border: solid 2px #09b;
  font-weight: bold;
  background: #09bb;
  color: #eef;
}

.line-text {
  color: #555;
}

</style>
