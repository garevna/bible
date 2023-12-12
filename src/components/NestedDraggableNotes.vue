<template>
  <v-card
    :key="ready"
    flat
    class="transparent mx-auto"
    max-width="960"
  >
    <v-row justify="end" class="mb-5 mx-4">
      <ControlsView :showControls.sync="show" />
    </v-row>

    <nested-draggable
      :elements="items"
      :modified.sync="modified"
      :removed.sync="removed"
      :show="show"
    />

    <v-card flat class="transparent mx-auto my-12" width="240">
      <v-btn outlined color="primary" @click="saveTopic">
        <v-icon class="mr-2"> $save </v-icon>
          Зберегти
      </v-btn>
    </v-card>
  </v-card>
</template>

<script>

import nestedDraggable from '@/components/NestedDraggable.vue'

import { getTopicData, saveTopic } from '@/helpers'

export default {
  name: 'NestedDraggableNotes',

  components: {
    nestedDraggable,
    ControlsView: () => import('@/components/ControlsView.vue')
  },

  props: {
    topic: {
      type: Object,
      required: true
    }
  },

  data () {
    return {
      ready: 0,
      modified: false,
      items: [],
      removed: null,
      show: true
    }
  },

  watch: {
    modified (val) {
      if (!val) return

      console.log('LIST OF ITEMS MODIFIED:\n', this.items)

      this.items.forEach(item => {
        if (item.type === 'note' && item.verses.length > item.refs.length) {
          Object.assign(item, { refs: item.verses.map(verse => verse._id) })
        }
      })
      Object.assign(this, { modified: false })
    },

    topic (data) {
      this.getTopicData()
        .then(() => Object.assign(this, { ready: ++this.ready }))
    },

    findIndex (index, id) {
      return this.items[index]._id === id
        ? ({ index })
        : this.items[index].refs
          ? ({ index, num: this.items[index].refs.indexOf(id) })
          : -1
    },

    removed (elem) {
      if (elem.type === 'note') {
        elem.topics.removeById(this.topic._id)
        this.topic.order.removeById(elem._id)
        const { _id, text, refs, topics, keywords } = elem
        this.$root.contentController.putNote({ _id, text, refs, topics, keywords })
      } else {
        this.topic.refs.removeById(elem._id)
      }

      this.items.removeById(elem._id)

      ++this.ready
    }
  },

  methods: {
    saveTopic,
    getTopicData,

    buildOrder (items) {
      const rest = items.filter(item => !this.topic.order.includes(item._id))
      this.topic.order.push(...rest.map(item => (item._id)))
    },

    getVerseLink ({ bookName, chapterNum, line }) {
      return `${bookName} ${chapterNum}:${line + 1}`
    },

    getVerseText ({ _id, bookName, chapterNum, line, text }) {
      return `${text} <small class="link-to-verse" @click="${require('@/helpers/gotoVerse.js').gotoVerse}('${_id}')">(${bookName} ${chapterNum}:${line + 1})</small>`
    },

    updateItems (modifiedItem) {
      const index = this.items.findIndex(item => item._id === modifiedItem._id)

      if (index === -1) return console.warn('Modified item not found in collection:\n', modifiedItem)

      if (!modifiedItem.topics.includes(this.topic._id)) this.items.splice(index, 1)
      else Object.assign(this.items[index], modifiedItem)
    }
  },

  created () {
    this.getTopicData()
      .then(() => Object.assign(this, { ready: ++this.ready }))
  },

  mounted () {
    this.$root.$on('note-updated', this.updateItems)
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
