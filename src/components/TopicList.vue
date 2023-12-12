<template>
  <v-dialog
    v-model="dialog"
    max-width="600"
  >
    <template v-slot:activator="{ on, attrs }">
      <ButtonTooltip
        :fab="fab"
        :icon='icon || buttonIcon'
        :text="buttonTooltipText"
        :small="small"
        :large="large"
        v-bind="attrs"
        v-on="on"
        :clicked.sync="dialog"
      />
    </template>

    <v-card flat class="homefone pb-4">
      <v-toolbar flat dense class="transparent" height="48">
        <v-spacer />
        <v-icon @click="dialog = false">
          $close
        </v-icon>
      </v-toolbar>

      <v-card flat class="transparent px-5 pb-8" :key="ready">
        <v-autocomplete
          v-model="topic"
          :items="topics"
          item-text="title"
          item-key="_id"
          return-object
          dense
          outlined
          autofocus
          hide-selected
          hide-details
          label="Тема"
          :no-data-text="noDataText"
          :search-input.sync="search"
        />
      </v-card>

      <v-btn
        outlined
        :disabled="!topic.title"
        color="buttons"
        @click="saveTopic"
        class="d-block mx-auto"
        width="120"
      >
        OK
      </v-btn>
    </v-card>
  </v-dialog>
</template>

<script>

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import { menuItems } from '@/configs'

const { getCommonText } = require('@/configs/language').default

export default {
  name: 'TopicList',

  components: {
    ButtonTooltip
  },

  props: ['lineRef', 'selectedTopic', 'fab', 'icon', 'tooltipText', 'small', 'large'],

  data: () => ({
    noDataText: getCommonText('ua', 'noData'),
    ready: 0,
    records: [],
    topics: [],
    topic: {
      _id: Date.now().toString(),
      title: '',
      refs: []
    },
    search: '',
    dialog: false,
    buttonTooltipText: menuItems[2].text,
    buttonIcon: menuItems[2].icon
  }),

  watch: {
    dialog (val) {
      val && this.getData()
    }
  },

  methods: {
    async getData () {
      this.topics = await this.$root.contentController.getTopics()
      ++this.ready
    },

    async saveTopic () {
      if (!this.topic.title && !this.search) return

      !this.topic.title && Object.assign(this.topic, { title: this.search })

      this.lineRef && !this.topic.refs.includes(this.lineRef) && this.topic.refs.push(this.lineRef)

      await this.$root.contentController.putTopic(this.topic)

      this.$emit('update:selectedTopic', this.topic)

      Object.assign(this, { search: '', dialog: false })
    }
  },

  mounted () {
    Object.assign(this, {
      buttonTooltipText: this.tooltipText || this.buttonTooltipText,
      buttonIcon: this.icon || this.buttonIcon
    })
  }
}
</script>
