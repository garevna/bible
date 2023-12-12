<template>
  <v-container
    style="max-width: 960px; padding: 16px 0 0 !important"
  >
    <v-app-bar flat class="transparent my-8 my-md-4">
      <Selector
        :selectedDate.sync="date"
        :selectedKeyword.sync="keyword"
        :selectedTopic.sync="topic"
        :title="title"
      />
    </v-app-bar>

    <v-row justify="end" class="mx-4">
      <ControlsView :showControls.sync="showControls" />
    </v-row>

    <AddNote
      :fab="true"
      icon="$addNote"
      :note.sync="newNote"
      :topic="topic"
      :keyword="keyword"
    />

    <v-sheet
      :key="ready"
      class="transparent overflow-y-auto my-12"
      :style="sheetStyle"
    >
        <v-card flat class="transparent pa-4" v-if="!date && !keyword && !topic._id">
          <v-icon color="warning" class="mr-2">
            $warning
          </v-icon>
          <small style="color: #aaa">
            Умови пошуку не визначені. Виберіть один із критеріїв вище.
          </small>
        </v-card>

        <v-card flat class="transparent overflow-auto" v-else>
          <Note
            v-for="note of notes"
            :key="note._id"
            :note="note"
            :edited.sync="edited"
            :removed.sync="removed"
            :expanded.sync="expanded"
            :static="true"
            :showControls="showControls"
          />
        </v-card>
    </v-sheet>
  </v-container>
</template>

<script>

import { footerMenu } from '@/configs'

import { getSelector } from '@/helpers'

const { getCommonText } = require('@/configs/language').default

export default {
  name: 'Notes',

  components: {
    ControlsView: () => import('@/components/ControlsView.vue'),
    Note: () => import('@/components/Note.vue'),
    AddNote: () => import('@/components/AddNote.vue'),
    Selector: () => import('@/components/Selector.vue')
  },

  data: () => ({
    ready: 0,
    showControls: true,
    title: footerMenu[1].text,
    noDataText: getCommonText('ua', 'noData'),
    notes: [],
    date: null,
    keyword: null,
    topic: { _id: null, title: '' },
    edited: null,
    expanded: null,
    removed: null,
    newNote: null
  }),

  computed: {
    sheetStyle () {
      return `height: calc(100vh - ${this.viewportWidth < 600 ? 420 : 300})`
    }
  },

  watch: {
    date (val) {
      this.getNotes()
    },

    topic (obj) {
      this.getNotes()
    },

    keyword (val) {
      this.getNotes()
    },

    removed (value) {
      const index = this.notes.findIndex(note => note._id === value)
      index !== -1 && this.notes.splice(index, 1) && ++this.ready
    },

    newNote (data) {
      console.log('NEW NOTE:\n', data)
      if (!data) return
      const index = this.notes.findIndex(note => note._id === data._id)
      index === -1
        ? this.notes.push(JSON.parse(JSON.stringify(data)))
        : this.notes.splice(index, 1, data)
      Object.assign(this, { newNote: null })
    }
  },

  methods: {
    async getNotes () {
      if (!this.date && !this.keyword && !this.topic._id) {
        return console.warn('Filter conditions are not defined')
      }

      this.notes = await this.$root.contentController
        .getNotes({ date: this.date, keyword: this.keyword, topic: this.topic._id })
    },

    async getTopics (item) {
      this.topics = await this.$root.contentController.getTopics(item.topics)
    }
  },

  created () {
    const { date, keyword, topic } = getSelector()
    Object.assign(this, { date, keyword, topic })
  }
}
</script>
