<template>
  <v-container class="transparent">
    <v-navigation-drawer
      v-if="ready"
      v-model="drawer"
      :mini-variant.sync="mini"
      permanent
      color="transparent"
    >
      <v-list-item>
        <v-icon color="primary" class="mr-2">
          $topics
        </v-icon>

        <v-list-item-content>
          <v-list-item-title> {{ title }} </v-list-item-title>
        </v-list-item-content>

        <v-btn
          icon
          @click.stop="mini = !mini"
        >
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>
      </v-list-item>

      <v-divider />

      <v-list dense v-if="!mini">
        <v-list-item
          v-for="item of topics"
          :key="item._id"
          link
        >
          <v-list-item-icon>
            <v-icon small color="#900">$delete</v-icon>
          </v-list-item-icon>

          <v-list-item-content>
            <v-list-item-title>
              {{ item.title }}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <v-divider />

      <template v-slot:append>
        <div dark color="primary">
          <v-text-field
            v-if="!mini"
            v-model="newTopic"
            append-icon="$add"
            outlined
            dense
            hide-details
            class="mx-4"
            @click:append="add"
          />
        </div>
      </template>
    </v-navigation-drawer>

    <v-card flat class="transparent mx-auto" max-width="960" v-if="ready">
      <!-- <TopicContent /> -->
    </v-card>

  </v-container>
</template>

<script>

import { footerMenu } from '@/configs'

export default {
  name: 'Topics',

  data: () => ({
    title: footerMenu[3].text,
    drawer: true,
    mini: true,
    ready: false,
    topics: [],
    newTopic: '',
    expanded: [],
    verses: [],
    versesReady: false,
    headers: [
      { text: '', value: '_id', width: '120' },
      { text: '', value: 'title', width: '320' },
      { text: '', value: 'data-table-expand', align: 'end' }
    ]
  }),

  computed: {
    expandedId () {
      return this.expanded[0]?._id
    }
  },

  watch: {
    expanded: {
      deep: true,
      handler (data) {
        if (!data.length) return
        this.getVerses(data[0])
          .then(verses => {
            this.verses = verses
            this.versesReady = true
          })
      }
    }
  },

  methods: {
    async getVerses (item) {
      const verses = await this.$root.contentController.getVerses(item.refs)
      return verses.map(verse => ({
        book: verse.bookName,
        chapter: verse.chapterNum,
        line: verse.line + 1,
        text: verse.text
      }))
    },

    async getNotes (item) {
      const notes = await this.$root.contentController.getNotesByIndex('_id', item.notes)
      notes.forEach(note => console.log(note))
    },

    getItemStyle (item) {
      return this.expandedId === item._id
        ? { color: '#090', fontWeight: 'bold' }
        : { color: '#777', fontWeight: 'normal' }
    },

    add () {
      if (!this.newTopic) return
      const found = this.topics.find(topic => topic.title === this.newTopic)
      if (found) {
        this.expandedId = found._id
        return
      }
      this.$root.contentController.putTopic({ title: this.newTopic })
    }
  },

  async created () {
    const response = await this.$root.contentController.getTopics()
    console.log(response)

    this.topics = response
    this.ready = true
  }
}
</script>

<style>

/* .v-application--is-ltr .v-data-table__mobile-row__cell {
  text-align: left;
} */

/* .v-data-table__mobile-row {
  display: table-cell;
  justify-content: start;
} */

.v-data-table > .v-data-table__wrapper > table > tbody > tr > td {
  padding: 4px;
}

.expanded-item-header {
  color: #09b;
  font-weight: bold;
}
</style>
