<template>
  <v-dialog
    v-model="dialog"
    max-width="480"
  >
    <template v-slot:activator="{ on, attrs }">
      <ButtonTooltip
        :icon='buttonIcon'
        :text="buttonTooltipText"
        :small="true"
        v-bind="attrs"
        v-on="on"
        :clicked.sync="dialog"
      />
    </template>

    <v-card flat class="homefone">
      <v-toolbar flat dense class="transparent" height="48">
        <v-spacer />
        <v-icon large @click="dialog = false">
          $close
        </v-icon>
      </v-toolbar>

      <v-card flat class="transparent pa-4" v-if="ready">
        <v-autocomplete
          v-model="topic"
          :items="topics"
          item-text="title"
          return-object
          prepend-icon="$add"
          append-icon="$submit"
          dense
          outlined
          label="Тема"
          no-data-text="Немає відповідних даних"
          @click:append="saveTopic"
          :search-input.sync="search"
        />
      </v-card>
    </v-card>
  </v-dialog>
</template>

<script>

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import { menuItems } from '@/configs'

export default {
  name: 'TopicList',

  components: {
    ButtonTooltip
  },

  props: ['lineRef'],

  data: () => ({
    ready: false,
    records: [],
    topics: [],
    topic: '',
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
      this.ready = true
    },

    async saveTopic () {
      if (!this.topic && !this.search) return
      if (!this.topic) {
        this.topic = {
          _id: Date.now().toString(),
          title: this.search,
          notes: [],
          refs: this.lineRef ? [this.lineRef] : []
        }
      } else {
        const refs = !this.topic.refs
          ? [this.lineRef]
          : !this.topic.refs.includes(this.lineRef)
            ? this.topic.refs.concat([this.lineRef])
            : this.topic.refs

        this.topic.refs = refs
      }

      this.topics.push(this.topic)

      await this.$root.contentController.putTopic(this.topic)
      this.topic = null
      this.search = ''
      this.dialog = false
    }
  }
}
</script>

<style>

.v-toolbar__content {
  padding: 4px !important;
}
</style>
