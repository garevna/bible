<template>
  <fieldset class="field-set">
    <legend>Ключові слова</legend>

    <table :key="ready" class="mb-4">
      <tr
        v-for="keyword in keywords"
        :key="keyword"
      >
        <td width="48">
          <v-tooltip bottom color="warning">
            <template v-slot:activator="{ on, attrs }">
              <v-icon
                color="delete"
                class="delete-icon"
                v-bind="attrs"
                v-on="on"
                @click="remove(keyword)"
              >
                $remove
              </v-icon>
            </template>
            <span>Прибрати зі списку</span>
          </v-tooltip>
        </td>
        <td> {{ keyword }} </td>
      </tr>
    </table>

    <KeywordList
      :lineRef="note ? null : lineRef"
      :selectedKeyword.sync="keyword"
      icon="mdi-pound-box"
      :large="true"
      buttonText="Додати"
    />
  </fieldset>
</template>

<script>

import '@/sass/fieldset.css'
import '@/sass/delete.css'

export default {
  name: 'EditKeywordList',

  props: ['lineRef', 'note'],

  components: {
    KeywordList: () => import('@/components/KeywordList.vue')
  },

  data: () => ({
    ready: 0,
    keywords: [],
    keyword: null
  }),

  watch: {
    lineRef: {
      immediate: true,
      handler (val) {
        if (!val) return

        this.$root.contentController
          .getKeywords(val)
          .then(keywords => Object.assign(this, { keywords, ready: ++this.ready }))
      }
    },

    keyword (value) {
      if (!value) return

      const index = this.keywords.findIndex(keyword => keyword === value)

      index === -1 && this.keywords.push(value)

      if (this.note) {
        !Array.isArray(this.note.keywords) && Object.assign(this.note, { keywords: [] })
        !this.note.keywords.includes(value) && this.note.keywords.push(value)
      }
      Object.assign(this, { keyword: null, ready: ++this.ready })
    }
  },

  methods: {
    async remove (kwd) {
      const index = this.keywords.findIndex(keyword => keyword === kwd)

      if (index === -1) return console.warn(`Keyword ${kwd} not found`)

      if (this.note) {
        const num = Array.isArray(this.note.keywords)
          ? this.note.keywords.findIndex(item => item === kwd)
          : -1
        num !== -1 && this.note.keywords.splice(num, 1)
      } else {
        this.lineRef && this.$root.contentController.putKeyword(kwd, null, this.lineRef)
        this.keywords.splice(index, 1)
      }

      ++this.ready
    }
  },

  mounted () {
    this.note && Object.assign(this, { keywords: this.note.keywords })
  }
}
</script>
