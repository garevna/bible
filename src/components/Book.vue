<template>
  <v-card flat class="transparent mx-auto" max-width="960" v-if="ready">
    <div class="px-2">
      <v-icon large color="secondary">
        mdi-book-open-variant
      </v-icon>
      <h3 style="display: inline-block; color: #09b;" class="ml-2">
        {{ bookTitle }}
      </h3>
    </div>

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

import { replaceChapter } from '@/helpers'

export default {
  name: 'Book',

  components: {
    Chapter
  },

  props: ['covenantIndex', 'bookIndex', 'bookTitle', 'books'],

  data: () => ({
    chapter: 1,
    chapterContent: null,
    ready: false
  }),

  watch: {
    async bookIndex (val) {
      await this.getChapterContent()
    },

    chapter (val) {
      replaceChapter(val - 1)
    }
  },

  async created () {
    const verse = localStorage.getItem('verse')
    ;[, , this.chapter = 1] = verse
      ? verse.split('.').map(item => Number(item) + 1)
      : [null, null, Number(localStorage.getItem('chapter'))]

    if (!this.chapter) Object.assign(this, { chapter: 1 })

    this.ready = true
  }
}
</script>

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
