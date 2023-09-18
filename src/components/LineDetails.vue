<template>
    <v-dialog
      v-model="details"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <v-card flat class="homefone pa-4">
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="$emit('update:details', false)">
            <v-icon>$close</v-icon>
          </v-btn>
          <v-spacer />
          <v-toolbar-items>
            <v-tabs v-model="tab" dark color="primary" active-class="active-tab-class">
              <v-tabs-slider color="warning" />
              <v-tab v-for="(tab, index) of tabs" :key="index">
                <v-icon left>
                  {{ tab.icon }}
                </v-icon>
                {{ tab.text }}
              </v-tab>
            </v-tabs>
          </v-toolbar-items>
        </v-toolbar>

        <v-tabs-items v-model="tab">
          <v-tab-item>
            <v-card flat class="transparent">
              <KeywordList :lineRef="lineRef" />
              <span
                v-for="keyword in keywords"
                :key="keyword"
                style="border: solid 1px #ddd; border-radius: 4px; margin: 0 4px; padding: 4px"
              >
                <v-icon small color="delete" @click="removeKeyword(keyword)">
                  $delete
                </v-icon>
                {{ keyword }}
              </span>
            </v-card>
          </v-tab-item>

          <v-tab-item>
            <v-card flat class="transparent">
              <TopicList :lineRef="lineRef" />
              <span
                v-for="topic in topics"
                :key="topic._id"
                style="border: solid 1px #ddd; border-radius: 4px; margin: 0 4px; padding: 4px"
              >
                <v-icon small color="delete" @click="removeTopic(topic._id)">
                  $delete
                </v-icon>
                {{ topic.title }}
              </span>
            </v-card>
          </v-tab-item>

          <v-tab-item>
            <v-card flat class="transparent">
              <AddNoteToLine :line="lineRef" />
              <div
                v-for="note in notes"
                :key="note._id"
              >
                <v-icon small color="delete" @click="removeKeyword(keyword)">
                  $delete
                </v-icon>
                {{ note.text }}
              </div>
            </v-card>
          </v-tab-item>
        </v-tabs-items>
      </v-card>
    </v-dialog>
</template>

<script>

import TopicList from '@/components/TopicList.vue'
import KeywordList from '@/components/KeywordList.vue'
import AddNoteToLine from '@/components/AddNoteToLine.vue'

export default {
  name: 'LineDetails',

  components: {
    KeywordList,
    TopicList,
    AddNoteToLine
  },

  props: ['lineRef', 'details'],

  data: () => ({
    ready: false,
    line: null,
    keywords: [],
    topics: [],
    notes: [],
    tabs: [
      { icon: '$keywords', text: 'Теги' },
      { icon: '$topics', text: 'Теми' },
      { icon: '$notes', text: 'Нотатки' }
    ],
    tab: 0
  }),

  watch: {
    lineRef (val) {
      if (!val) return
      this.ready = false
      this.notesReady = false

      Promise.all([this.getKeywords(), this.getNotes()])
        .then(() => this.$nextTick(() => { this.ready = true }))
    },

    refresh (val) {
      if (!val) return
      this.ready = false

      Promise.all([this.getKeywords(), this.getNotes(), this.getTopics()])
        .then(() => { this.ready = true })
    }
  },

  methods: {
    async getLine () {
      this.line = await this.$root.contentController.getLine(this.lineRef)
    },

    async getKeywords () {
      this.keywords = await this.$root.contentController.getLineKeywords(this.lineRef)
      Object.assign(this, { keywords: this.keywords })
    },

    async getTopics () {
      this.topics = await this.$root.contentController.getLineTopics(this.lineRef)
      Object.assign(this, { topics: this.topics })
    },

    async getNotes () {
      const response = await this.$root.contentController.getNotes({ lineRef: this.lineRef })
      this.notes = response
    },

    removeKeyword (keyword) {
      this.keywords.splice(this.keywords.indexOf(keyword), 1)
    },

    removeTopic (topicId) {
      this.topics.splice(this.topics.findIndex(topic => topic._id === topicId), 1)
    },

    removeNote (noteId) {
      //
    },

    changeTab (tab, index) {
      this.tabs.unshift(this.tabs.splice(index, 1)[0])
    }
  },

  async created () {
    await this.getLine()
    await Promise.all([this.getKeywords(), this.getTopics(), this.getNotes()])

    this.ready = true
  }
}
</script>

<style>
.v-tab {
  justify-content: start;
}

.v-tab--active {
  color: #efe !important;
}

.v-application--is-ltr .v-data-table__mobile-row__cell {
  text-align: left;
}
</style>
