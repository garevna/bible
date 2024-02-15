<template>
  <v-card flat class="transparent mx-auto py-5" max-width="960" :key="lang">
    <table class="mt-5 mb-2">
      <tr>
        <td>
          <v-icon large color="primary" @click="returnToTopicList"> $return </v-icon>
        </td>
        <td>
          <span class="topic-title primary--text ml-3">
            {{ currentTopic?.title || '' }}
          </span>
        </td>
      </tr>
    </table>

    <NestedDraggableNotes />
  </v-card>
</template>

<script>

import { mapState, mapActions } from 'vuex'

export default {
  name: 'Topic',

  components: {
    NestedDraggableNotes: () => import('@/components/NestedDraggableNotes.vue')
  },

  computed: {
    ...mapState(['lang']),
    ...mapState('topics', ['currentTopic'])
  },

  methods: {
    ...mapActions('topics', ['returnToTopicList'])
  }
}
</script>
