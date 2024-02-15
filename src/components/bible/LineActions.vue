<template>
  <v-card flat class="transparent" min-width="120" @click="showClick">
    <AddKeywordToList
      :lineRef="lineRef"
      :small="true"
    />
    <AddTopicToList
      :lineRef="lineRef"
      icon="$addTopic"
    />
    <CreateNote
      :lineRef="lineRef"
      icon="$addNote"
      :small="true"
      :tooltipText="_notes.addNoteToVerseTooltip"
    />

    <LineDetails
      v-if="showDetails"
      :lineRef="lineRef"
      :details.sync="showDetails"
    />
  </v-card>
</template>

<script>

import { mapState, mapGetters, mapMutations } from 'vuex'

export default {
  name: 'LineActions',

  components: {
    LineDetails: () => import('@/components/bible/LineDetails.vue'),
    AddKeywordToList: () => import('@/components/keywords/AddKeywordToList.vue'),
    AddTopicToList: () => import('@/components/topics/AddTopicToList.vue'),
    CreateNote: () => import('@/components/notes/CreateNote.vue')
  },

  props: ['verse'],

  data: () => ({
    topic: null,
    kwd: null
  }),

  computed: {
    ...mapGetters('language', ['_notes']),
    ...mapState('content', ['currentLineId']),

    lineRef () {
      return this.verse._id
    },

    showDetails: {
      get () {
        return this.currentLineId === this.lineRef
      },
      set () {
        this.setCurrentLineId(null)
      }
    }
  },

  methods: {
    ...mapMutations('content', ['setCurrentLineId', 'setVerse']),

    showClick () {
      console.log('LINE ACTIONS CLICKED', this.lineRef, this.verse)
      this.setCurrentLineId(this.lineRef)
      this.setVerse(this.verse)
    }
  }
}
</script>
