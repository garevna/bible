<template>
  <span>
    <v-tooltip top>
      <template v-slot:activator="{ on, attrs }">
        <v-icon
          :color="color || 'buttons'"
          v-bind="attrs"
          v-on="on"
          class="mx-2"
          @click="dialog = true"
        >
          $topic
        </v-icon>
      </template>
      <span> {{ _selector.topicPrompt }} </span>
    </v-tooltip>

    <v-dialog
      v-model="dialog"
      min-width="320"
      max-width="480"
      style="background-color: #FAFAFA"
    >
      <table width="100%" class="mb-8">
        <tr>
          <td>
            <strong class="ml-4">{{ _topics.select }}</strong>
          </td>
          <td width="48" class="text-right">
            <v-btn icon @click="dialog = false">
              <v-icon>$close</v-icon>
            </v-btn>
          </td>
        </tr>
      </table>

      <div class="text-center mx-auto px-4">
        <v-autocomplete
          v-model="topic"
          :items="searchResult"
          item-key="_id"
          item-text="title"
          return-object
          dense
          outlined
          clearable
          prepend-icon="$topic"
          :label="_selector.textSearchPrompt"
          hide-details
          :no-data-text="_selector.noData"
          :search-input.sync="search"
        />
        <v-btn
          class="mx-auto mt-8 mb-4"
          text
          outlined
          color="buttons"
          width="120"
          @click="dialog = false"
        >
          {{ _selector.okButton }}
        </v-btn>
      </div>
    </v-dialog>
  </span>
</template>

<script>

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'SelectTopicDialog',

  props: ['selectedTopic', 'color'],

  data: () => ({
    dialog: false,
    search: ''
  }),

  computed: {
    ...mapGetters('language', ['_selector', '_topics']),
    ...mapState('topics', ['searchResult']),

    topic: {
      get () {
        return this.selectedTopic || null
      },
      set (data) {
        this.$emit('update:selectedTopic', data || null)
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
