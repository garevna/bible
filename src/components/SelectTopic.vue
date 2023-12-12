<template>
  <v-autocomplete
    v-if="ready"
    v-model="topic"
    :items="topics"
    item-key="_id"
    item-text="title"
    return-object
    dense
    outlined
    clearable
    :dark="dark"
    prepend-icon="$topic"
    label="Тема"
    hide-details
    :no-data-text="noDataText"
    :search-input.sync="search"
  />
</template>

<script>

// import { getSelector } from '@/helpers'

const { getCommonText } = require('@/configs/language').default

export default {
  name: 'SelectTopic',

  props: ['selected', 'dark'],

  data: () => ({
    noDataText: getCommonText('ua', 'noData'),
    search: '',
    topics: [],
    ready: false
  }),

  computed: {
    topic: {
      get () {
        return this.selected || { _id: null, title: '' }
      },
      set (data) {
        const { _id = null, title = '' } = data
        this.$emit('update:selected', { _id, title })
      }
    }
  },

  watch: {
    selected (val) {
      console.log('SELECTED TOPIC CHANGED: ', val)
    }
  },

  async created () {
    this.topics = await this.$root.contentController.getTopics()
    this.ready = true
  }
}
</script>
