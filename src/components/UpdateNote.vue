<template>
  <v-card flat class="transparent pa-0 pa-md-8">
    <EditTopicList :note="localNote" />

    <v-textarea
      v-model="localNote.text"
      class="mb-8"
      auto-grow
      autofocus
      clearable
      counter
      clear-icon="mdi-close-circle"
    />

    <EditKeywordList :note="localNote" />

    <v-btn
      outlined
      color="buttons"
      @click="saveNote"
      class="d-block mt-5 mx-auto"
      width="120"
    >
        Зберегти
      </v-btn>
  </v-card>
</template>

<script>

export default {
  name: 'UpdateNote',

  components: {
    EditKeywordList: () => import('@/components/EditKeywordList.vue'),
    EditTopicList: () => import('@/components/EditTopicList.vue')
  },

  props: {
    note: {
      type: Object,
      required: true
    },
    dialog: {
      type: Boolean
    }
  },

  computed: {
    localNote: {
      get () {
        return JSON.parse(JSON.stringify(this.note))
      },

      set (data) {
        // this.$emit('update:note', JSON.parse(JSON.stringify(this.localNote)))
      }
    }
  },

  methods: {
    async saveNote () {
      const { _id, text, topics, refs, keywords } = this.localNote
      await this.$root.contentController.putNote({ _id, text, topics, refs, keywords })

      this.$emit('update:note', JSON.parse(JSON.stringify(this.localNote)))
      this.$emit('update:dialog', false)
    }
  }
}
</script>
