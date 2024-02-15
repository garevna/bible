<template>
  <div :class="className">
    <v-row v-if="showControls" class="my-2">
      <v-icon
        color="delete"
        @click="removeNote(note)"
        class="delete-icon"
      >
        {{ icon }}
      </v-icon>

      <v-spacer />

      <DialogToUpdateNote :note="note" />
    </v-row>

    <div>
      <v-chip small class="mr-2">
        {{ new Date(note._id - 0).toISOString().slice(0, 10) }}
      </v-chip>
      <span v-html="note.text" />
    </div>

    <v-row
      v-if="note.refs.length || note.topics.length"
      justify="center"
      class="my-1"
    >
      <v-icon @click="expand">
        {{ expanded !== note._id ? '$expand' : '$collapse' }}
      </v-icon>
    </v-row>

    <v-row v-if="expanded === note._id">
      <p
        class="draggable-item"
        v-for="verse of currentNoteVerses"
        :key="verse._id"
        v-html="verse.html"
        @click="$root.$gotoVerse(verse._id)"
      />
    </v-row>

    <!-- <div :ref="note._id" class="ml-8" /> -->
  </div>
</template>

<script>

import '@/sass/drag.css'
import '@/sass/delete.css'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'Note',

  components: {
    DialogToUpdateNote: () => import('@/components/notes/DialogToUpdateNote.vue')
  },

  props: ['note', 'removed', 'expanded', 'static', 'showControls'],

  data: () => ({
    // keywords: [],
    // verses: []
  }),

  computed: {
    ...mapGetters('language', ['notes']),
    ...mapState('notes', ['currentNote', 'currentNoteTopics', 'currentNoteVerses']),

    className () {
      return this.note._id === this.currentNote?._id ? 'draggable-item' : 'draggable-item draggable-item--fone'
    },

    icon () {
      return this.static ? '$delete' : '$remove'
    }
  },

  methods: {
    ...mapActions('notes', ['getCurrentNote', 'setCurrentNote', 'removeNote']),
    async expand () {
      await this.setCurrentNote(this.note)
      this.$emit('update:expanded', this.expanded === this.note._id ? null : this.note._id)
    }
  }
}
</script>
