<template>
  <fieldset class="field-set">
    <legend> {{ _topics.listHeader }} </legend>

    <table width="100%" class="mb-4">
      <tr
        v-for="topic in topics"
        :key="topic._id"
      >
        <td width="48">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-icon
                color="delete"
                class="delete-icon"
                v-bind="attrs"
                v-on="on"
                @click="removeTopic(topic._id)"
              >
                $remove
              </v-icon>
            </template>
            <span> {{ _topics.removeFromListTooltip }} </span>
          </v-tooltip>
        </td>
        <td> {{ topic.title }} </td>
      </tr>
    </table>

    <AddTopicToList
      :lineRef="lineRef"
      :noteId="noteId"
    />
  </fieldset>
</template>

<script>

import '@/sass/fieldset.css'
import '@/sass/delete.css'

import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  name: 'EditTopicList',

  props: ['lineRef', 'noteId'],

  components: {
    AddTopicToList: () => import('@/components/topics/AddTopicToList.vue')
  },

  data: () => ({
    // selectedTopic: null
  }),

  computed: {
    ...mapGetters('language', ['_topics']),
    ...mapState('content', ['lineTopics']),
    ...mapState('notes', ['currentNoteTopics']),

    topics () {
      console.log('LINE TOPICS:\n', this.lineTopics)
      console.log('CURRENT NOTE TOPICS:\n', this.currentNoteTopics)
      return this.lineRef
        ? this.lineTopics
        : this.noteId
          ? this.currentNoteTopics
          : []
    }
  },

  watch: {
    lineRef (val) {
      val && this.getLineTopics(val)
    },
    noteId (val) {
      val && this.getCurrentNoteTopics()
    }
  },

  methods: {
    ...mapActions('content', ['getLineTopics', 'removeTopicFromVerse']),
    ...mapActions('notes', ['getCurrentNoteTopics']),
    ...mapMutations('notes', ['addTopicToCurrentNote', 'removeTopicFromCurrentNote']),

    // async getData () {
    //   this.noteId && await this.getCurrentNoteTopics(this.noteId)
    //   this.lineRef && await this.getLineTopics(this.lineRef)
    // },

    removeTopic (topicId) {
      this.lineRef && this.removeTopicFromVerse({ topic: topicId, lineRef: this.lineRef })
      this.noteId && this.removeTopicFromCurrentNote(topicId)
    }
  },

  async mounted () {
    // await this.getData()
  }
}
</script>
