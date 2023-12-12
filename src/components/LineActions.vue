<template>
  <v-card flat class="transparent" min-width="120">
    <KeywordList
      :lineRef="lineRef"
      :small="true"
    />
    <TopicList
      :lineRef="lineRef"
      icon="$addTopic"
    />
    <AddNote
      :lineRef="lineRef"
      icon="$addNote"
      :small="true"
    />

    <LineDetails
      v-if="showDetails"
      :lineRef="lineRef"
      :details.sync="showDetails"
    />
  </v-card>
</template>

<script>

export default {
  name: 'LineActions',

  components: {
    LineDetails: () => import('@/components/LineDetails.vue'),
    KeywordList: () => import('@/components/KeywordList.vue'),
    TopicList: () => import('@/components/TopicList.vue'),
    AddNote: () => import('@/components/AddNote.vue')
  },

  props: ['lineRef', 'activeRef'],

  data: () => ({
    topic: null,
    kwd: null
  }),

  computed: {
    showDetails: {
      get () {
        return this.activeRef === this.lineRef
      },
      set () {
        this.$emit('update:activeRef', null)
      }
    }
  },

  watch: {
    kwd (keyword) {
      // keyword && this.$emit('update:keyword', keyword._id)
    },

    topic (data) {
      console.log('TOPIC:\n', data)
      // val && this.$emit('update:topic', data)
    }
  }
}
</script>
