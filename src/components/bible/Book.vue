<template>
  <v-card
    flat
    class="transparent mx-auto"
    max-width="960"
  >
    <div class="px-2">
      <v-icon large color="secondary">
        mdi-book-open-variant
      </v-icon>
      <h3 style="display: inline-block" class="ml-2 secondary--text">
        {{ bookTitle }}
      </h3>
    </div>

    <v-pagination
      v-model="chapter"
      class="my-4"
      :length="chapters"
      color="buttons"
    />

    <Chapter />
  </v-card>
</template>

<script>

import Chapter from '@/components/bible/Chapter.vue'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'Book',

  components: {
    Chapter
  },

  computed: {
    ...mapState('content', ['covenantIndex', 'bookIndex', 'bookTitle', 'chapterIndex']),
    ...mapGetters('content', ['book']),
    ...mapGetters('user', ['signed']),

    chapters () {
      return this.book ? this.book.chapters : 0
    },

    chapter: {
      get () {
        return this.chapterIndex + 1
      },
      set (val) {
        this.selectChapter(val - 1)
      }
    }
  },

  methods: {
    ...mapActions('content', ['selectChapter'])
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
