<template>
  <fieldset class="field-set">
    <legend>{{ _notes.listHeader }}</legend>
    <v-card flat class="transparent pa-4 mx-auto">
      <div
        v-for="note in lineNotes"
        :key="note._id"
        class="transparent py-2 px-4"
      >
        <v-icon
          small
          class="delete--text delete--icon"
          @click="removeNote(note)"
        >
          $delete
        </v-icon>
        {{ note.text }}
      </div>

      <v-divider inset class="transparent my-4" />

      <CreateNote
        :lineRef="lineRef"
        icon="$addNote"
        :large="true"
        :note.sync="note"
      />
    </v-card>
  </fieldset>
</template>

<script>

import { mapState, mapGetters /*, mapActions */ } from 'vuex'

export default {
  name: 'EditNoteList',

  props: ['lineRef', 'topicId'],

  components: {
    CreateNote: () => import('@/components/notes/CreateNote.vue')
  },

  data: () => ({
    note: null
  }),

  computed: {
    ...mapGetters('language', ['_notes']),
    ...mapState('content', ['lineNotes'])
  },

  watch: {
    // lineRef: {
    //   immediate: true,
    //   handler (val) {
    //     val && this.getLineNotes(val)
    //   }
    // }

    // note: {
    //   deep: true,
    //   handler (data) {
    //     console.log('NEW NOTE:\n', data)
    //     if (data) {
    //       this.ready = false
    //       const index = this.notes.findIndex(item => item._id === data._id)
    //       index === -1
    //         ? this.notes.push(JSON.parse(JSON.stringify(data)))
    //         : this.notes.splice(index, 1, data)
    //       this.$nextTick(() => Object.assign(this, { ready: true, note: null }))
    //     }
    //   }
    // }
  },

  methods: {
    // ...mapActions('content', ['getLineNotes']),

    removeNote (id) {
      // const index = this.notes.findIndex(note => note._id === id)
      //
      // if (index !== -1) {
      //   if (this.lineRef) {
      //     const num = this.notes[index].refs.findIndex(item => item === this.lineRef)
      //     num !== -1 && this.topics[index].refs.splice(num, 1)
      //     this.$root.contentController.putTopic(this.topics[index])
      //   }
      // }
      //
      // this.notes.splice(index, 1)
    }
  },

  mounted () {
    console.log(this.lineNotes)
    // this.lineRef && this.getLineNotes(this.lineRef)
  }
}
</script>
