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
        color="buttons"
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

    <v-card flat class="transparent" v-if="showBooks">
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
              class="book-menu-item mb-1"
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
    ready: false,
    books: [],
    showMenu: false,
    menuItems: [],
    selectedMenuItem: null
  }),

  computed: {
    chapters () {
      return this.showBooks ? [] : this.books[this.covenantIndex][this.bookIndex].chapters
    },

    showBooks () {
      return typeof this.bookIndex !== 'number'
    },

    bookTitle () {
      return this.ready &&
        !this.showBooks &&
        this.books[this.covenantIndex][this.bookIndex].title
    }
  },

  methods: {
    getBookList () {
      this.ready = false
      const promises = [0, 1].map(index => this.$root.contentController.getBookNames(this.covenantIndex))

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
      localStorage.setItem('book-index', this.bookIndex)
      localStorage.setItem('book-title', this.bookTitle)
    },

    async switchCovenant () {
      this.ready = false
      this.bookIndex = undefined
      this.covenantIndex = this.covenantIndex ? 0 : 1
      localStorage.setItem('covenant', this.covenantIndex)
      await this.getBookList()
      this.ready = true
      this.showMenu = false
    },

    resetBook () {
      this.bookIndex = undefined
    }
  },

  async created () {
    const verseId = localStorage.getItem('verse')

    if (verseId) {
      [this.covenantIndex, this.bookIndex] = verseId.split('.').map(item => Number(item))
    } else {
      [this.covenantIndex, this.bookIndex] = [
        localStorage.getItem('covenant') - 0 || 0,
        localStorage.getItem('book-index') - 0
      ]
    }

    await this.getBookList()
  },

  beforeDestroy () {
    localStorage.removeItem('verse')
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
