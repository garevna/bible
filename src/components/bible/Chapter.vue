<template>
  <v-card flat class="transparent mx-auto pb-12" max-width="960">
    <!-- <v-toolbar flat class="transparent">
      <v-spacer />
      <v-btn-toggle
        v-if="signed"
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
          <v-icon large color="#999" @click="resetMarker">
            mdi-close
          </v-icon>
        </v-btn>
      </v-btn-toggle>
    </v-toolbar> -->

    <table :key="translation">
      <tbody>
        <tr v-for="(item, index) of chapterContent" :key="index">
          <td>
            <sup :class="item._id === verseId ? 'line-number--emph' : 'line-number--normal'">
              {{ index + 1 }}
            </sup>
          </td>
          <td>
            <p
              :id="item._id"
              v-html="item.html || item.verse"
              :style="cursorStyle"
              @click.stop="setCurrentVerse(item)"
              :class="item._id === verseId ? 'line-text--emph' : ''"
            />
          </td>
          <td>
            <LineActions
              v-if="signed"
              :verse="item"
            />
          </td>
        </tr>
      </tbody>
    </table>

    <LineDetails :dialog.sync="dialog" />

    <!-- <DropdownMenu
      :showMenu.sync="showMenu"
      :event.sync="event"
      :selected.sync="option"
      :menuItems="menuItems"
    /> -->

    <v-bottom-navigation
      fixed
      v-model="highlighter"
      class="transparent mb-12"
      height="48"
    >
      <v-btn-toggle
        v-if="signed"
        v-model="toggle"
        mandatory
        dense
        active-class="active-highlighter"
        background-color="#ddd"
        style="box-shadow: #0005 0px 0px 8px"
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
          <v-icon large color="#999" @click="resetMarker">
            mdi-close
          </v-icon>
        </v-btn>
      </v-btn-toggle>
    </v-bottom-navigation>
  </v-card>
</template>

<script>

import Highlighter from '@/assets/Highlighter.vue'

// import DropdownMenu from '@/components/DropdownMenu.vue'
import LineActions from '@/components/bible/LineActions.vue'
import LineDetails from '@/components/bible/LineDetails.vue'

import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  name: 'Chapter',

  components: {
    Highlighter,
    // DropdownMenu,
    LineActions,
    LineDetails
  },

  data: () => ({
    toggle: 4,
    highlighter: null,
    showMenu: false,
    option: null,
    event: {},
    details: false,
    dialog: false
  }),

  computed: {
    ...mapState(['viewportWidth']),
    ...mapState('user', ['translation', 'lang']),
    ...mapGetters('user', ['signed']),
    ...mapState('content', ['currentLineId', 'verseId', 'chapterContent', 'highlightColor']),
    ...mapGetters('content', ['cursorStyle'])
  },

  watch: {
    toggle (val) {
      if (val === 4) this.resetMarker()
      else this.setListeners()
    },

    option (val) {
      this.keywordClicked = val === 'keywords' ? this.lineRef : null
      this.noteClicked = val === 'notes' ? this.lineRef : null
      this.topicClicked = val === 'topics' ? this.lineRef : null
    },

    dialog (val) {
      !val && this.resetExpantion()
    },

    translation (val) {
      console.log('TRANSLATION: ', val)
    }
  },

  methods: {
    ...mapActions('content', [
      'selectionChange',
      'getChapterContent',
      'setCursor',
      'setHighlightColor',
      'getLine',
      'getLineNotes',
      'getLineKeywords',
      'getLineTopics'
    ]),

    ...mapMutations('content', [
      'resetHighlightning',
      'restoreCursor',
      'setCurrentLineId',
      'setVerse',
      'setLineKeywords',
      'setLineTopics',
      'setLineNotes'
    ]),

    // showLineDetails (verse) {
    //   if (this.cursorStyle !== 'default') return
    //   console.log(verse)
    //   this.setCurrentLineId(verse._id)
    //   // this.details = true
    // },

    selectOption (event, item) {
      Object.assign(this, { lineRef: item._id })
      this.event = {
        x: event.clientX,
        y: event.clientY,
        show: true
      }
      this.showMenu = true
    },

    getPosition (sourceText, fragment) {
      const start = sourceText.indexOf(fragment)
      return [start, start + fragment.length - 1]
    },

    resetMarker () {
      this.resetHighlightning()
      this.clearListeners()
    },

    resetSelection () {
      this.resetMarker()
      this.$nextTick(() => {
        this.restoreCursor()
        document.getSelection().empty()
        this.cursorStyle !== 'default' && this.setListeners()
      })
    },

    resetExpantion () {
      this.setCurrentLineId(null)
      this.setVerse(null)
      this.setLineKeywords([])
      this.setLineTopics([])
      this.setLineNotes([])

      this.dialog = false
    },

    async setCurrentVerse (item) {
      console.log('CURRENT VERSE:\n', item)
      this.setCurrentLineId(item._id)

      this.setVerse(item)

      const promises = ['getLineNotes', 'getLineKeywords', 'getLineTopics']
        .map(actionName => this[actionName](this.currentLineId))
      await Promise.all(promises)

      this.dialog = true
    },

    setMouseButtonState (event) {
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
    await this.getChapterContent()
  },

  mounted () {
    this.resetExpantion()

    this.verseId && setTimeout(function () {
      const elem = document.getElementById(this.verseId)
      elem && this.$vuetify.goTo(elem, {
        duration: 300,
        offset: 100,
        easing: 'easeInOutCubic'
      })
    }.bind(this), 200)

    this.$root.$on('marker-changed', this.changeMarker)

    if (performance.navigation.type === performance.navigation.TYPE_RELOAD) {
      console.warn('This page has been reloaded')
    }
  },

  beforeDestroy () {
    this.clearListeners()
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
.line-text--emph {
  font-weight: bold;
  color: #09b;
}

</style>
