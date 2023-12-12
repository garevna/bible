<template>
  <div :class="className" :key="ready">
    <v-row v-if="showControls" class="my-2">
      <EditNote
        :note.sync="localNote"
        icon="$editNote"
        tooltipText="Редагувати нотатку"
      />

      <v-spacer />

      <v-icon
        color="delete"
        @click="removeNote"
        class="delete-icon"
      >
        {{ icon }}
      </v-icon>
    </v-row>

    <div>
      <v-chip small class="mr-2">
        {{ new Date(localNote._id - 0).toISOString().slice(0, 10) }}
      </v-chip>
      <span v-html="localNote.text" />
    </div>

    <v-row
      justify="center"
      class="my-1"
    >
      <v-icon
        v-if="localNote.refs.length"
        @click="$emit('update:expanded', expanded === localNote._id ? null : localNote._id)"
      >
        {{ expanded !== localNote._id ? '$expand' : '$collapse' }}
      </v-icon>
    </v-row>

    <div :ref="localNote._id" class="ml-8" />
  </div>
</template>

<script>

import '@/sass/drag.css'
import '@/sass/delete.css'

const { deleteDocument } = require('@/firebase').default

export default {
  name: 'Note',

  components: {
    EditNote: () => import('@/components/EditNote.vue')
  },

  props: ['note', 'removed', 'expanded', 'static', 'showControls'],

  data: () => ({
    ready: 0,
    keywords: [],
    verses: []
  }),

  computed: {
    localNote: {
      get () {
        return this.note
      },
      set (note) {
        this.$emit('update:note', JSON.parse(JSON.stringify(note)))
      }
    },

    className () {
      return this.expanded === this.localNote._id ? 'draggable-item' : 'draggable-item draggable-item--fone'
    },

    icon () {
      return this.static ? '$delete' : '$remove'
    }
  },

  watch: {
    expanded (val) {
      val === this.localNote._id
        ? this.getVerses()
        : Object.assign(this.$refs[this.localNote._id], { innerHTML: '' })
    }
  },

  methods: {
    removeNote () {
      deleteDocument('notes', this.localNote._id)
      this.$emit('update:removed', this.localNote._id)
    },

    saveNote () {
      this.$root.contentController.putNote(this.localNote)
      this.$emit('update:note', JSON.parse(JSON.stringify(this.localNote)))
    },

    async getVerses () {
      const verses = this.note.refs && this.note.refs.length
        ? await this.$root.contentController.getVersesByRefs(this.note.refs)
        : []

      verses
        .map(verse => this.$refs[this.localNote._id].appendChild(this.$root.getVerseNode(verse)))
    }
  }
}
</script>
