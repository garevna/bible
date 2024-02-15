<template>
  <v-dialog v-model="dialog" max-width="960">
    <v-card flat class="homefone pa-4">
      <v-toolbar flat dense class="transparent ma-0 pa-0" height="48">
        <v-spacer />
        <v-icon large @click="$emit('update:dialog', false)">
          $close
        </v-icon>
      </v-toolbar>
      <v-card flat class="transparent pa-0 pa-md-8">
        <EditTopicList :noteId="noteId" />

        <v-textarea
          v-model="noteText"
          class="mb-8"
          auto-grow
          autofocus
          clearable
          counter
          clear-icon="mdi-close-circle"
        />

        <EditKeywordList :noteId="noteId" />

        <v-btn
          outlined
          color="buttons"
          @click="save"
          class="d-block mt-5 mx-auto"
          width="120"
        >
          {{ _notes.saveButton }}
        </v-btn>
      </v-card>
    </v-card>
  </v-dialog>
</template>

<script>

import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  name: 'UpdateNote',

  components: {
    EditKeywordList: () => import('@/components/keywords/EditKeywordList.vue'),
    EditTopicList: () => import('@/components/topics/EditTopicList.vue')
  },

  props: {
    dialog: {
      type: Boolean,
      required: true,
      default: false
    },

    lineRef: {
      type: String,
      required: false
    }
  },

  computed: {
    ...mapGetters('language', ['_notes']),
    ...mapState('content', ['currentVerse', 'lineNotes']),
    ...mapState('notes', ['currentNote']),

    noteText: {
      get () {
        return this.currentNote?.text
      },
      set (val) {
        this.updateCurrentNoteText(val)
      }
    },

    noteId () {
      return this.currentNote?._id
    }
  },

  methods: {
    ...mapActions('notes', ['saveCurrentNote', 'saveCurrentNote']),
    ...mapMutations('notes', ['updateCurrentNoteText']),
    ...mapMutations('content', ['addNoteToVerse']),

    async save () {
      console.log('SAVE CURRENT NOTE:\n', this.lineRef, this.currentNote.refs)
      await this.saveCurrentNote()
      this.lineRef && this.currentVerse._id === this.lineRef && this.addNoteToVerse(this.currentNote)
      this.lineRef && this.currentVerse._id === this.lineRef && console.log(this.lineNotes)
      this.$emit('update:dialog', false)
    }
  }
}
</script>
