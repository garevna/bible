<template>
  <v-container
    style="max-width: 960px; padding: 16px 0 0 !important"
    :key="lang"
  >
    <v-app-bar flat class="transparent my-8 my-md-4">
      <NotesFilterOptions />
    </v-app-bar>

    <v-row justify="end" class="mx-4">
      <ControlsView :showControls.sync="showControls" />
    </v-row>

    <v-sheet
      class="transparent overflow-y-auto my-12"
      :style="sheetStyle"
    >
        <v-card flat class="transparent pa-4" v-if="!date && !keyword && !topic._id">
          <v-icon color="warning" class="mr-2">
            $warning
          </v-icon>
          <small style="color: #aaa">
            {{ _selector.noSearchOptions }}
          </small>
        </v-card>

        <v-card flat class="transparent overflow-auto" v-else>
          <Note
            v-for="note of notes"
            :key="note._id"
            :note="note"
            :static="true"
            :showControls="showControls"
          />
        </v-card>
    </v-sheet>

    <v-bottom-navigation fixed height="48" class="mb-12 pt-2" background-color="#ddd">
      <DatePickerDialog :date.sync="selectedDate" />
      <SelectKeywordDialog :selectedKeyword.sync="selectedKeyword" />
      <SelectTopicDialog :selectedTopic.sync="selectedTopic" />
      <CreateNote />
    </v-bottom-navigation>
  </v-container>
</template>

<script>

import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  name: 'Notes',

  components: {
    DatePickerDialog: () => import('@/components/selectors/DatePickerDialog.vue'),
    SelectKeywordDialog: () => import('@/components/selectors/SelectKeywordDialog.vue'),
    SelectTopicDialog: () => import('@/components/selectors/SelectTopicDialog.vue'),
    ControlsView: () => import('@/components/ControlsView.vue'),
    Note: () => import('@/components/notes/Note.vue'),
    CreateNote: () => import('@/components/notes/CreateNote.vue'),
    NotesFilterOptions: () => import('@/components/NotesFilterOptions.vue')
  },

  data: () => ({
    showControls: true,
    newNote: null,
    selectedDate: null,
    selectedKeyword: '',
    selectedTopic: null
  }),

  computed: {
    ...mapState(['lang']),
    ...mapGetters('language', ['_selector']),
    ...mapState('notes', ['notes', 'topic', 'keyword', 'date']),

    sheetStyle () {
      return `height: calc(100vh - ${this.viewportWidth < 600 ? 420 : 300})`
    }
  },

  watch: {
    selectedDate (val) {
      this.updateDate(val)
    },
    selectedKeyword (val) {
      this.updateKeyword(val)
    },
    selectedTopic (val) {
      this.updateTopic(val)
    },

    newNote (data) {
      if (!data) return
      const index = this.notes.findIndex(note => note._id === data._id)
      index === -1
        ? this.notes.push(JSON.parse(JSON.stringify(data)))
        : this.notes.splice(index, 1, data)
      Object.assign(this, { newNote: null })
    }
  },

  methods: {
    ...mapMutations('notes', ['addNote']),
    ...mapActions('notes', ['init', 'getNotes', 'getCurrentNoteTopics', 'updateDate', 'updateKeyword', 'updateTopic'])
  },

  async created () {
    this.init()
  }
}
</script>
