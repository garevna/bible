<template>
  <v-card flat class="transparent mx-auto" max-width="990" height="100%">
    <!-- <v-toolbar flat class="transparent">
      <v-toolbar-title>
        <strong class="mr-4" style="color: #090">{{ title }}</strong>
      </v-toolbar-title> -->
      <!-- <h4 class="my-5 mx-auto" style="color: #090">{{ title }}</h4> -->

      <!-- <v-spacer />
      <DatePicker :date.sync="date" :availableDates="availableDates" /> -->

    <!-- <DatePicker :date.sync="date" :availableDates="availableDates" /> -->

    <!-- </v-toolbar> -->

    <Selector
      :selectedDate.sync="date"
      :selectedKeyword.sync="keyword"
      :selectedTopic.sync="topic"
    />

    <v-data-table
      v-if="ready"
      :items="notes"
      :headers="headers"
      item-key="_id"
      :items-per-page="-1"
      show-expand
      single-expand
      :expanded.sync="expanded"
      hide-default-footer
    />

    <v-bottom-navigation absolute flat class="transparent" height="48">
      <v-btn outlined @click="add">
        <v-icon>$add</v-icon>
        Додати замітку
      </v-btn>
    </v-bottom-navigation>
  </v-card>
</template>

<script>

import { footerMenu } from '@/configs'

import Selector from '@/components/Selector.vue'

// import DatePicker from '@/components/DatePicker.vue'

export default {
  name: 'Notes',

  components: {
    Selector
    // DatePicker
  },

  data: () => ({
    sourceData: [],
    title: footerMenu[1].text,
    // notes: [],
    date: new Date().toISOString().slice(0, 10),
    availableDates: [],
    keyword: '',
    topic: '',
    ready: false,
    expanded: [],
    headers: [
      { text: '', align: 'start', sortable: false, value: 'text' },
      { text: '', value: 'data-table-expand' }
    ]
  }),

  watch: {
    ready: {
      immediate: true,
      handler (val) {
        !val && this.getNotes()
      }
    },

    date (val) {
      this.ready = !val
    },

    topic (val) {
      this.ready = !val
    },

    keyword (val) {
      this.ready = !val
      // console.log('KEYWORD: ', val)
      // val && this.getNotes()
    }
  },

  methods: {
    async getNotes () {
      // this.ready = false
      console.log({ date: this.date, keyword: this.keyword, topic: this.topic })
      this.notes = await this.$root.contentController.getNoteList({ date: this.date, keyword: this.keyword, topic: this.topic })
      console.log('NOTES:\n', this.notes)
      this.$nextTick(() => { this.ready = true })
      // this.topics = await this.$root.contentController.getTopics()
      // console.log('TOPICS:\n', this.topics)
    },

    add (item) {
      console.log(item)
    }
  },

  async created () {
    const keys = await this.$root.contentController.getAllKeys('notes', 'date')
    console.log('AVAILABLE KEYS:\n', keys)

    this.availableDates = keys.status === 200
      ? keys.result.map(key => new Date(key - 0).toISOString().slice(0, 10))
      : []

    // await this.getNotes({ date: this.date, keyword: this.keyword, topic: this.topic })
    // console.log(this.notes)
    // this.ready = true
  }
}
</script>
