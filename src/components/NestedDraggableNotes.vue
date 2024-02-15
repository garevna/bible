<template>
  <v-card
    flat
    class="transparent mx-auto"
    max-width="960"
  >
    <v-row justify="end" class="mb-5 mx-4">
      <ControlsView :showControls.sync="show" />
    </v-row>

    <nested-draggable
      :elements="currentTopicData"
      :modified.sync="modified"
      :removed.sync="removed"
      :show="show"
    />

    <v-card flat class="transparent mx-auto my-12" width="240">
      <v-btn outlined color="primary" @click="saveCurrentTopic">
        <v-icon class="mr-2"> $save </v-icon>
          {{ _nestedDraggable.saveButton }}
      </v-btn>
    </v-card>
  </v-card>
</template>

<script>

import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

import nestedDraggable from '@/components/NestedDraggable.vue'

export default {
  name: 'NestedDraggableNotes',

  components: {
    nestedDraggable,
    ControlsView: () => import('@/components/ControlsView.vue')
  },

  data () {
    return {
      modified: false,
      removed: null,
      show: true
    }
  },

  computed: {
    ...mapGetters('language', ['_nestedDraggable']),
    ...mapState('topics', ['currentTopic', 'currentTopicData'])
  },

  watch: {
    modified (val) {
      if (!val) return

      this.currentTopicData.forEach(item => {
        if (item.type === 'note' && item.verses.length > item.refs.length) {
          Object.assign(item, { refs: item.verses.map(verse => verse._id) })
        }
      })
      Object.assign(this, { modified: false })
    },

    findIndex (index, id) {
      return this.currentTopicData[index]._id === id
        ? ({ index })
        : this.currentTopicData[index].refs
          ? ({ index, num: this.currentTopicData[index].refs.indexOf(id) })
          : -1
    },

    removed (elem) {
      const { _id: topicId, order, refs } = this.currentTopic
      if (elem.type === 'note') {
        order.removeById(elem._id)
        elem.topics.removeById(topicId)
        const { _id, text, refs, topics, keywords } = elem
        this.putNote({ _id, text, refs, topics, keywords })
      } else {
        refs.removeById(elem._id)
      }
      this.updateCurrentTopic({ order, refs })

      this.removeCurrentTopicDataItem(elem._id)
    }
  },

  methods: {
    ...mapMutations('topics', ['updateCurrentTopic', 'removeCurrentTopicDataItem']),
    ...mapActions('topics', ['saveCurrentTopic']),
    ...mapActions('notes', ['putNote']),

    updateItems (modifiedItem) {
      const index = this.currentTopicData
        .findIndex(item => item._id === modifiedItem._id)

      if (index === -1) return console.warn('Modified item not found in collection:\n', modifiedItem)

      if (!modifiedItem.topics.includes(this.currentTopic._id)) this.currentTopicData.splice(index, 1)
      else Object.assign(this.currentTopicData[index], modifiedItem)
    }
  }
}
</script>

<style scoped>

.topic-title {
  font-size: 16px;
  font-weight: bold;
}

.delete-icon {
  opacity: 0.4;
}

.delete-icon:hover {
  opacity: 0.8;
}
</style>
