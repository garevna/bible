<template>
  <v-card flat class="transparent mx-auto my-4" max-width="700">
    <!-- <h4>{{ title }}</h4> -->
    <v-data-table
      v-if="ready"
      :headers="headers"
      :items="keywords"
      single-expand
      :expanded.sync="expanded"
      item-key="_id"
      show-expand
      class="transparent"
      hide-default-header
      hide-default-footer
      :caption="title"
      calculate-widths
      :items-per-page="-1"
    >

      <template v-slot:item._id="{ item }">
        <span :style="getItemStyle(item)">
          {{ item._id }}
        </span>
      </template>

      <template v-slot:expanded-item="{ headers }">
        <td :colspan="headers.length">
          <v-card flat class="transparent pa-4" v-if="versesReady">
            <v-card-text v-for="(verse, index) in verses" :key="index">
              {{ verse.text }}
              <small>
                <b style="color: #09b">
                  ({{ verse.book }} {{ verse.chapter }}:{{ verse.line }})
                </b>
              </small>
            </v-card-text>
          </v-card>
        </td>
      </template>

    </v-data-table>
  </v-card>
</template>

<script>

import { footerMenu } from '@/configs'

export default {
  name: 'Keywords',

  data: () => ({
    title: footerMenu[2].text,
    ready: false,
    keywords: [],
    expanded: [],
    verses: [],
    versesReady: false,
    headers: [
      { text: '', value: '_id', width: '320' },
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
      const verses = await this.$root.contentController.getVersesByRefs(item.refs)
      return verses.map(verse => ({
        book: verse.bookName,
        chapter: verse.chapterNum,
        line: verse.line + 1,
        text: verse.text
      }))
    },

    getItemStyle (item) {
      return this.expandedId === item._id
        ? { color: '#090', fontWeight: 'bold' }
        : { color: '#777', fontWeight: 'normal' }
    }
  },

  getBookName (bookRef) {

  },

  async created () {
    this.keywords = (await this.$root.contentController.getKeywords()).result
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
