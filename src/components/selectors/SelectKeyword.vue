<template>
  <v-autocomplete
    v-model="select"
    :items="searchResult"
    item-text="_id"
    dense
    outlined
    clearable
    :prepend-icon="prependIcon"
    hide-details
    :label="_selector.textSearchPrompt"
    :no-data-text="_selector.noData"
    :search-input.sync="search"
    @click:prepend="createKeyword"
  />
</template>

<script>

import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

const addIcon = '$add'

export default {
  name: 'SelectKeyword',

  props: ['selected', 'dark'],

  data: () => ({
    search: ''
  }),

  computed: {
    ...mapGetters('language', ['_selector']),
    ...mapState('keywords', ['keyword', 'searchResult']),

    prependIcon () {
      return this.search && this.search.length && !this.searchResult.length
        ? addIcon
        : '$search'
    },

    select: {
      get () {
        return this.selected
      },
      set (val) {
        this.$emit('update:selected', val)
      }
    }
  },

  watch: {
    search (val) {
      val && val !== this.select && this.searchKeywords(val)
    }
  },

  methods: {
    ...mapActions('keywords', ['searchKeywords', 'putKeyword']),
    ...mapMutations('keywords', ['updateSearchResult']),

    async createKeyword () {
      if (this.prependIcon !== addIcon) return
      await this.putKeyword({
        _id: this.search,
        refs: []
      })
      this.updateSearchResult([this.search])
    }
  },

  async created () {
    // Object.assign(this, { keywords: await this.getKeywords() })
    console.log('KEYWORDS CREATED - SEARCH RESULT:\n', this.searchResult)
  }
}
</script>
