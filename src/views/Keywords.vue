<template>
  <v-card flat class="transparent mx-auto my-4" max-width="700">
    <v-card flat class="transparent content-toggle-buttons" max-width="700">
      <v-btn-toggle v-model="toggle" mandatory>
        <v-tooltip bottom color="buttons">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              text
              color="buttons"
              v-bind="attrs"
              v-on="on"
            >
              <v-icon color="buttons">
                $verses
              </v-icon>
            </v-btn>
          </template>
          <span> Вірші з Біблії </span>
        </v-tooltip>

        <v-tooltip bottom color="buttons">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              text
              color="buttons"
              v-bind="attrs"
              v-on="on"
            >
              <v-icon color="buttons">$notes</v-icon>
            </v-btn>
          </template>
          <span> Нотатки </span>
        </v-tooltip>
      </v-btn-toggle>
    </v-card>

    <v-expansion-panels
      v-model="panel"
      class="transparent mt-4"
      style="height: calc(100vh - 240px); overflow-y: auto"
    >
      <v-expansion-panel
        v-for="(keyword, num) in keywords"
        :key="keyword._id"
      >
        <v-expansion-panel-header :style="getHeaderStyle(num)">
          <tr>
            <td width="48">
              <v-icon
                @click="deleteItem(keyword)"
                class="delete-icon"
                color="delete"
              >
                $delete
              </v-icon>
            </td>
            <td>
              {{ keyword._id }}
            </td>
          </tr>
        </v-expansion-panel-header>

        <v-expansion-panel-content>
          <v-card flat class="transparent pa-4" :key="contentReady">
              <div v-for="(item, index) in content" :key="index" style="text-align: justify">
                {{ item.text }}
                <small
                  v-if="toggle === 0"
                  class="link-to-verse"
                  @click="gotoVerse(item._id)"
                >
                  ({{ item.book }} {{ item.chapter }}:{{ item.line }})
                </small>
                <v-divider class="my-2" />
              </div>
          </v-card>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-card>
</template>

<script>

import '@/sass/delete.css'

import { footerMenu } from '@/configs'
import { gotoVerse } from '@/helpers'

export default {
  name: 'Keywords',

  data: () => ({
    title: footerMenu[2].text,
    ready: 0,
    toggle: 0,
    panel: undefined,
    keywords: [],
    content: [],
    contentReady: 0
  }),

  computed: {
    methodName () {
      return ['getVerses', 'getNotes'][this.toggle]
    },

    toggleButtonStyle () {
      return this.$root.viewportWidth >= 700
        ? 'margin-right: calc(50% - 350px)'
        : 'margin-right: 0'
    }
  },

  watch: {
    panel (val) {
      if (val === undefined) return

      this.changeContent()
    },

    toggle (val) {
      this.changeContent()
    }
  },

  methods: {
    gotoVerse,

    changeContent () {
      this[this.methodName](this.keywords[this.panel])
        .then(response => Object.assign(this, {
          content: response,
          contentReady: ++this.contentReady
        }))
    },

    async getVerses (keyword) {
      const verses = await this.$root.contentController.getVersesByRefs(keyword.refs)
      return verses.map(verse => ({
        _id: verse._id,
        book: verse.bookName,
        chapter: verse.chapterNum,
        line: verse.line + 1,
        text: verse.text
      }))
    },

    async getNotes (keyword) {
      const notes = await this.$root.contentController.getNotes({ keyword: keyword._id })
      return notes
    },

    getHeaderStyle (index) {
      return this.panel === index
        ? { color: '#09b', fontWeight: 'bold' }
        : { color: '#777', fontWeight: 'normal' }
    }
  },

  async created () {
    this.keywords = await this.$root.contentController.getKeywords()
    ++this.ready
  }
}
</script>

<style>
.content-toggle-buttons {
  text-align: right;
}
</style>
