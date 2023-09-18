<template>
  <v-card flat class="transparent mx-auto" max-width="1008" v-if="ready">
    <v-row align="center" justify="end" class="my-2">
      <v-btn
        text
        @click.stop="resetBook"
        :disabled="!!covenantIndex"
      >
        <small>{{ $root.contentController.covenantNames[0] }}</small>
      </v-btn>

      <v-icon
        large
        color="secondary"
        class="mr-2"
        @click.stop="switchCovenant()"
      >
        {{ this.covenantIndex ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off' }}
      </v-icon>

      <v-btn
        text
        class="mr-4"
        @click.stop="resetBook"
        :disabled="!covenantIndex"
      >
        <small>{{ $root.contentController.covenantNames[1] }}</small>
      </v-btn>
    </v-row>

    <v-card flat class="transparent" v-if="bookIndex === undefined">
      <v-navigation-drawer
          permanent
          class="transparent"
          style="border: 0;"
      >
          <v-card flat class="pa-4 transparent">
            <h5 class="mb-4">
              {{ $root.contentController.covenantNames[covenantIndex] }}
            </h5>
            <v-divider class="mb-5" />
            <p
              v-for="(item, num) in books[covenantIndex]"
              :key="num"
              class="mb-1"
              style="cursor: pointer"
              @click.stop="selectBook(num)"
            >
              {{ item.title }}
              <v-divider class="my-3" v-if="item.div" />
            </p>
          </v-card>
      </v-navigation-drawer>
    </v-card>

    <v-card
      v-else
      flat
      class="transparent mx-auto"
    >
      <Book
        :covenantIndex="covenantIndex"
        :bookIndex="bookIndex"
        :bookTitle="bookTitle"
        :books="chapters"
      />
    </v-card>
  </v-card>
</template>

<script>

export default {
  name: 'Home',

  components: {
    Book: () => import('@/components/Book.vue')
  },

  data: () => ({
    covenantIndex: 0,
    bookIndex: undefined,
    bookTitle: '',
    ready: false,
    books: [],
    showMenu: false,
    showBooks: false,
    menuItems: [],
    selectedMenuItem: null
  }),

  computed: {
    chapters () {
      return this.books[this.covenantIndex][this.bookIndex].chapters
    }
  },

  watch: {
    bookIndex (val) {
      if (val === undefined) return
      this.bookTitle = this.books[this.covenantIndex][val].title
    }
  },

  methods: {
    getBookList (index) {
      const promises = [0, 1].map(index => this.$root.contentController.getBookNames(index))

      Promise.all(promises)
        .then(responses => {
          this.books = []
          responses.forEach(response => this.books.push(response.status === 200 ? response.result : []))

          this.menuItems = [
            this.$root.contentController.covenantNames[0],
            this.$root.contentController.covenantNames[1]
          ]

          this.ready = true
        })
    },

    selectBook (bookNum) {
      this.bookIndex = bookNum
      this.bookTitle = this.books[this.covenantIndex][this.bookIndex].title
    },

    async switchCovenant () {
      this.ready = false
      this.bookIndex = undefined
      this.covenantIndex = this.covenantIndex ? 0 : 1
      localStorage.setItem('covenant', this.covenantIndex)
      await this.getBookList()
      this.ready = true
      this.showBooks = true
      this.showMenu = false
    },

    resetBook () {
      this.bookIndex = undefined
    }
  },

  async created () {
    this.covenantIndex = localStorage.getItem('covenant') - 0 || 0
    await this.getBookList()
    this.showBooks = true
    this.ready = true
  }
}
</script>

<style scoped>

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

<style>
/* .v-pagination__item {
  box-shadow: none !important;
  border: solid 1px #ddd;
  font-size: 13px;
}

.v-pagination__navigation {
  box-shadow: none !important;
} */

.mdi-toggle-switch::before, .mdi-toggle-switch-off::before {
  font-size: 48px !important;
  color: #09b;
}
</style>
