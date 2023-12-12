<template>
  <v-card flat class="transparent mx-auto py-5" max-width="960" v-if="ready">
    <table class="mt-5 mb-2">
      <tr>
        <td>
          <v-icon large color="primary" @click="back"> $return </v-icon>
        </td>
        <td>
          <span class="topic-title primary--text ml-3">
            {{ topic.title }}
          </span>
        </td>
      </tr>
    </table>

    <NestedDraggableNotes :topic="topic" />
  </v-card>
</template>

<script>

export default {
  name: 'Search',

  components: {
    NestedDraggableNotes: () => import('@/components/NestedDraggableNotes.vue')
  },

  data: () => ({
    ready: false,
    topic: null
  }),

  methods: {
    back () {
      localStorage.removeItem('topic')
      localStorage.setItem('page', 'topics')
      this.$root.$emit('page-changed')
    },

    async getTopic () {
      const topicId = localStorage.getItem('topic')
      if (!topicId) this.back()
      Object.assign(this, {
        topic: await this.$root.contentController.getTopic(topicId)
      })

      !this.topic.order && Object.assign(this.topic, { order: [] })
    }
  },

  created () {
    this.getTopic()
      .then(() => Object.assign(this, { ready: true }))
  }
}
</script>
