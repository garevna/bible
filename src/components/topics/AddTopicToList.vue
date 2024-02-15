<template>
  <v-dialog
    v-model="dialog"
    max-width="600"
  >
    <template v-slot:activator="{ on, attrs }">
      <ButtonTooltip
        :fab="fab"
        :icon="icon || '$addTopic'"
        :text="tooltipText || _topics.addTopicTooltip"
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

      <v-card flat class="transparent px-5 pb-8">
        <SelectTopic :selected.sync="topic" />
      </v-card>

      <v-btn
        outlined
        :disabled="!topic?.title"
        color="buttons"
        @click="addTopic"
        class="d-block mx-auto"
        width="120"
      >
        {{ _selector.okButton }}
      </v-btn>
    </v-card>
  </v-dialog>
</template>

<script>

import ButtonTooltip from '@/components/ButtonTooltip.vue'

import { mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  name: 'AddTopicToList',

  components: {
    SelectTopic: () => import('@/components/selectors/SelectTopic.vue'),
    ButtonTooltip
  },

  props: ['lineRef', 'noteId', 'fab', 'icon', 'tooltipText', 'small', 'large'],

  data: () => ({
    dialog: false,
    topic: null
  }),

  computed: {
    ...mapGetters('language', ['_selector', '_topics'])
  },

  methods: {
    ...mapActions('content', ['addTopicToVerse']),
    ...mapMutations('notes', ['addTopicToCurrentNote']),

    async addTopic () {
      this.lineRef && await this.addTopicToVerse({ topic: this.topic, lineRef: this.lineRef })
      this.noteId && await this.addTopicToCurrentNote(this.topic)
      this.dialog = false
    }
  }
}
</script>
