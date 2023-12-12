<template>
  <v-card flat class="transparent pa-4 mx-auto">
    <div
      v-for="note in notes"
      :key="note._id"
      class="transparent py-2 px-4"
    >
      <v-icon small color="delete" @click="removeNote(note)">
        $delete
      </v-icon>
      {{ note.text }}
    </div>

    <v-divider inset class="transparent my-4" />

    <AddNote
      :lineRef="lineRef"
      icon="$addNote"
      :large="true"
      :note.sync="note"
    />
  </v-card>
</template>

<script>

export default {
  name: 'EditNoteList',

  props: ['lineRef'],

  components: {
    AddNote: () => import('@/components/AddNote.vue')
  },

  data: () => ({
    ready: true,
    notes: [],
    note: null
  }),

  watch: {
    lineRef: {
      immediate: true,
      handler (val) {
        val && this.getNotes(val)
      }
    },

    note: {
      deep: true,
      handler (data) {
        console.log('NEW NOTE:\n', data)
        if (data) {
          this.ready = false
          const index = this.notes.findIndex(item => item._id === data._id)
          index === -1
            ? this.notes.push(JSON.parse(JSON.stringify(data)))
            : this.notes.splice(index, 1, data)
          this.$nextTick(() => Object.assign(this, { ready: true, note: null }))
        }
      }
    }
  },

  methods: {
    getNotes (lineRef) {
      this.ready = false
      this.$root.contentController
        .getNotes({ lineRef })
        .then(notes => Object.assign(this, { notes, ready: true }))
    },

    removeNote (id) {
      const index = this.notes.findIndex(note => note._id === id)

      if (index !== -1) {
        if (this.lineRef) {
          const num = this.notes[index].refs.findIndex(item => item === this.lineRef)
          num !== -1 && this.topics[index].refs.splice(num, 1)
          this.$root.contentController.putTopic(this.topics[index])
        }
      }

      this.notes.splice(index, 1)
    }
  }
}
</script>
