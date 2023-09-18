<template>
  <v-card flat class="transparent mx-auto" max-width="960" v-if="ready">
    <v-icon large color="primary">
      mdi-book-open-variant
    </v-icon>
    <h4 style="display: inline-block" class="ml-2">{{ bookTitle }}</h4>

    <v-pagination
      v-model="chapter"
      class="my-4"
      :length="books"
    />

    <Chapter
      :covenantIndex="covenantIndex"
      :bookIndex="bookIndex"
      :chapter="chapter"
    />
  </v-card>
</template>

<script>

import Chapter from '@/components/Chapter.vue'

export default {
  name: 'Book',

  components: {
    Chapter
  },

  props: ['covenantIndex', 'bookIndex', 'bookTitle', 'books'],

  data: () => ({
    chapter: 1,
    chapterContent: null,
    lineRef: '',
    expanded: [],
    ready: false,
    menuItems: [
      { text: 'Додати замітку або коментар', value: 'notes' },
      { text: 'Вказати ключові слова для системи пошуку', value: 'keywords' },
      { text: 'Пов\'язати з певною темою', value: 'topics' }
    ],
    showMenu: false,
    option: null,
    event: {},
    dialog: false,
    keyword: '',
    noteId: '',
    headers: [
      { text: '', align: 'start', justify: 'end', sortable: false, value: 'line', width: '32px' },
      { text: '', align: 'start', justify: 'start', sortable: false, value: 'text' },
      // { text: '', sortable: false, value: 'actions', width: 180 },
      { text: '', value: 'data-table-expand' }
    ],
    keywordClicked: false,
    topicClicked: false,
    noteClicked: false,
    refreshLineDetails: false
  }),

  watch: {
    async bookIndex (val) {
      await this.getChapterContent()
    },

    chapter (val) {
      this.getChapterContent()
    },

    option (val) {
      console.log('Selected option: ', val)
      if (this.option === 'keywords') this.dialog = true
    },

    keyword (val) {
      console.log('NEW KEYWORD ADDED TO LINE: ', val)
      this.refreshLineDetails = true
    }
  },

  methods: {
    async getChapterContent () {
      this.chapterContent = await this.$root.contentController.getBookChapter(this.covenantIndex, this.bookIndex, this.chapter - 1)
    },

    selectOption (event, item) {
      this.event = {
        x: event.clientX,
        y: event.clientY,
        show: true
      }
      this.showMenu = true
    },

    addKeyword (ref) {
      this.lineRef = ref
      this.dialog = true
    },

    addNote (ref) {
      this.lineRef = ref
    }
  },

  async created () {
    await this.getChapterContent()
    this.ready = true
  }
}
</script>

<style>

/* .v-application--is-ltr .v-data-table__mobile-row__cell {
  text-align: left;
} */

.v-data-table__mobile-row {
  display: table-cell;
  justify-content: start;
}

.v-data-table > .v-data-table__wrapper > table > tbody > tr > td {
  padding: 4px;
}

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

.line-number {
  border: solid 1px #bbb;
  border-radius: 4px;
  margin-right: 8px;
  padding: 0 4px;
  color: #999;
}

.line-text {
  color: #555;
}

</style>
