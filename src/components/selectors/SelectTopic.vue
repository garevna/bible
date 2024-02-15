<template>
  <v-autocomplete
    v-model="topic"
    :items="searchResult"
    item-key="_id"
    item-text="title"
    return-object
    dense
    outlined
    clearable
    :dark="dark"
    prepend-icon="$topic"
    :label="_selector.textSearchPrompt"
    hide-details
    :no-data-text="_selector.noData"
    :search-input.sync="search"
  />
</template>

<script>

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'SelectTopic',

  props: ['selected', 'dark'],

  data: () => ({
    search: ''
  }),

  computed: {
    ...mapGetters('language', ['_selector']),
    ...mapState('topics', ['searchResult']),

    topic: {
      get () {
        return this.selected || null
      },
      set (data) {
        this.$emit('update:selected', data || null)
      }
    }
  },

  watch: {
    search (val) {
      val && val !== this.select && this.searchTopics(val)
    }
  },

  methods: {
    ...mapActions('topics', ['searchTopics'])
  }
}
</script>
