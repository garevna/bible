<template>
  <span>
    <ButtonTooltip
      v-if="!dialog"
      :fab="fab"
      :icon="icon || '$addNote'"
      :text="_notes.createNoteTooltip"
      :small="small"
      :large="large"
      :clicked.sync="dialog"
    />
      <UpdateNote :dialog.sync="dialog" :lineRef="lineRef" />
  </span>
</template>

<script>

import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  name: 'CreateNote',

  components: {
    ButtonTooltip: () => import('@/components/ButtonTooltip.vue'),
    UpdateNote: () => import('@/components/notes/UpdateNote.vue')
  },

  props: {
    lineRef: { required: false },
    topicId: { required: false },
    keywordId: { required: false },

    icon: { default: '$addNote' },
    fab: { default: false },
    small: { default: false },
    large: { default: false },
    tooltip: { required: false }
  },

  data: () => ({
    dialog: false
  }),

  computed: {
    ...mapGetters('language', ['_notes']),
    ...mapGetters('notes', ['newNote']),
    ...mapState('notes', ['currentNote'])
  },

  watch: {
    dialog (val) {
      console.log('CREATE NOTE COMPONENT: dialog = ', val)
      val && this.init()
    }
  },

  methods: {
    ...mapActions('notes', ['createNote', 'saveCurrentNote']),
    ...mapMutations('notes', ['setCurrentNote', 'setСurrentNoteTopics', 'setСurrentNoteVerses']),

    init () {
      const note = Object.assign({}, this.newNote)
      this.lineRef && note.refs.push(this.lineRef)
      this.topicId && note.topics.push(this.topicId)
      this.keywordId && note.keywords.push(this.keywordId)
      this.setСurrentNoteTopics([])
      this.setСurrentNoteVerses([])
      this.setCurrentNote(note)
    }
  }
}
</script>
