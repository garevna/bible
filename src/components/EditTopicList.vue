<template>
  <fieldset class="field-set">
    <legend>Теми</legend>
    <table :key="ready" width="100%" class="mb-4">
      <tr
        v-for="topic in topics"
        :key="topic._id"
      >
        <td width="48">
          <v-tooltip bottom color="primary">
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
            <span> Прибрати зі списку </span>
          </v-tooltip>
        </td>
        <td> {{ topic.title }} </td>
      </tr>
    </table>

    <TopicList
      :lineRef="note ? null : lineRef"
      :selectedTopic.sync="selectedTopic"
      icon="$addTopic"
      :large="true"
      tooltipText="Додати"
    />
  </fieldset>
</template>

<script>

import '@/sass/fieldset.css'
import '@/sass/delete.css'

export default {
  name: 'EditTopicList',

  props: ['lineRef', 'note'],

  components: {
    TopicList: () => import('@/components/TopicList.vue')
  },

  data: () => ({
    ready: 0,
    topics: [],
    selectedTopic: null
  }),

  watch: {
    lineRef: {
      immediate: true,
      handler (val) {
        if (!val) return

        this.$root.contentController
          .getLineTopics(val)
          .then(topics => Object.assign(this, { topics, ready: ++this.ready }))
      }
    },

    selectedTopic (data) {
      if (!data) return

      const index = this.topics.findIndex(item => item._id === data._id)

      index === -1 && this.topics.push(data)

      if (this.note && Array.isArray(this.note.topics) && !this.note.topics.includes(data._id)) {
        this.note.topics.push(data._id)
      }
      this.selectedTopic = null
    }
  },

  methods: {
    removeTopic (id) {
      const index = this.topics.findIndex(topic => topic._id === id)

      if (index !== -1) {
        if (this.note) {
          this.note.topics.splice(index, 1)
        } else {
          if (this.lineRef) {
            const num = this.topics[index].refs.findIndex(item => item === this.lineRef)
            num !== -1 && this.topics[index].refs.splice(num, 1)
            this.$root.contentController.putTopic(this.topics[index])
          }
        }

        this.topics.splice(index, 1)
        ++this.ready
      }
    }
  },

  mounted () {
    this.note &&
      this.note.topics.length &&
      this.$root.contentController
        .getTopics(this.note.topics)
        .then(topics => Object.assign(this, { topics, ready: ++this.ready }))
  }
}
</script>
