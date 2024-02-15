<template>
  <v-dialog
    v-model="dialog"
    max-width="600"
  >
    <template v-slot:activator="{ on, attrs }">
      <ButtonTooltip
        :fab="fab"
        :icon='buttonIcon'
        :text="buttonTooltipText"
        :small="small"
        :large="large"
        v-bind="attrs"
        v-on="on"
        :clicked.sync="open"
      />
    </template>

    <v-card flat class="homefone pb-4">
      <v-toolbar flat dense class="transparent" height="48">
        <v-spacer />
        <v-icon @click="open = false">
          $close
        </v-icon>
      </v-toolbar>

      <v-card flat class="transparent px-5 pb-8" :key="ready">
        <v-text-field
          v-model="topic.title"
          :label="_topics.createNewTopicLabel"
          hide-details
          outlined
        />
      </v-card>

      <v-btn
        outlined
        v-show="!!topic.title"
        color="buttons"
        @click="saveTopic"
        class="d-block mx-auto"
        width="120"
      >
        {{ _topics.createNewTopicButton }}
      </v-btn>
    </v-card>
  </v-dialog>
</template>

<script>

import ButtonTooltip from '@/components/ButtonTooltip.vue'
// import { menuItems } from '@/configs'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'CreateTopic',

  components: {
    ButtonTooltip
  },

  props: ['lineRef', 'fab', 'icon', 'tooltipText', 'small', 'large'],

  data: () => ({
    search: '',
    dialog: false,
    open: false,
    topic: {}
  }),

  computed: {
    ...mapGetters('language', ['_common', '_topics']),
    ...mapState('topics', ['topicIdList', 'newTopic']),
    ...mapGetters('topics', ['newTopic']),

    buttonTooltipText () {
      return this.tooltipText || this._topics.tooltipText
    },

    buttonIcon () {
      return this.icon || '$addTopic'
    }
  },

  watch: {
    open (val) {
      if (val) {
        this.topic = this.newTopic
        this.getTopicIdList()
          .then(() => Object.assign(this, { dialog: true }))
      } else Object.assign(this, { dialog: false })
    }
  },

  methods: {
    ...mapActions('topics', ['getTopicIdList', 'putTopic']),

    async saveTopic (data) {
      this.lineRef && this.topic.refs.push(this.lineRef)
      await this.putTopic(this.topic)
      Object.assign(this, { open: false })
    }
  }
}
</script>
