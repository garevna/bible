<template>
  <v-card
    flat
    class="transparent mx-auto"
    max-width="1008"
    :key="lang"
  >
    <v-row align="center" justify="end" class="my-2">
      <v-btn
        text
        @click.stop="resetBook"
        :disabled="!!covenantIndex"
      >
        <small>{{ covenantNames[0] }}</small>
      </v-btn>

      <v-icon
        large
        color="buttons"
        class="mr-2"
        @click="switchCovenant()"
      >
        {{ this.covenantIndex ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off' }}
      </v-icon>

      <v-btn
        text
        class="mr-4"
        @click.stop="resetBook"
        :disabled="!covenantIndex"
      >
        <small>{{ covenantNames[1] }}</small>
      </v-btn>
    </v-row>

    <v-card
      v-if="!showChapter"
      flat
      class="transparent"
    >
      <v-navigation-drawer
        v-if="showBookList"
        permanent
        class="transparent"
        style="border: 0;"
      >
        <v-card flat class="pa-4 transparent">
          <h5 class="mb-4">
            {{ covenantNames[covenantIndex] }}
          </h5>
          <v-divider class="mb-5" />
          <p
            v-for="(book, num) in books[covenantIndex]"
            :key="num"
            class="book-menu-item mb-1"
            @click.stop="selectBook(num)"
          >
            <v-icon small color="buttons" class="mr-1">
              $book
            </v-icon>
            {{ book.title }}
            <v-divider class="my-3" v-if="book.div" />
          </p>
        </v-card>
      </v-navigation-drawer>
    </v-card>

    <Book v-else />
  </v-card>
</template>

<script>

import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  name: 'Home',

  components: {
    Book: () => import('@/components/bible/Book.vue')
  },

  data: () => ({
    showMenu: false,
    menuItems: [],
    selectedMenuItem: null
  }),

  computed: {
    ...mapState(['lang']),
    ...mapGetters('content', ['covenantNames']),
    ...mapState('content', ['covenantIndex', 'books', 'bookIndex', 'chapterIndex']),
    showChapter () {
      return this.bookIndex !== null
    },
    showBookList () {
      return Array.isArray(this.books) && this.bookIndex === null
    }
  },

  methods: {
    ...mapMutations('content', ['selectBook', 'resetBook']),
    ...mapActions('content', ['switchCovenant'])
  },

  mounted () {
    console.log(this.covenantNames)
  }
}
</script>

<style scoped>

.book-menu-item {
  cursor: pointer;
}

.book-menu-item:hover {
  background: #09b4;
  color: #09b;
}

.clicked-item {
  padding: 4px 16px;
  cursor: pointer;
  font-size: 13px;
}

.clicked-item-disabled {
  display: none;
}

.clicked-item:hover {
  background: #ddd;
}

.v-navigation-drawer {
  width: max-content !important;
}

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
