<template>
  <span>
    <ButtonTooltip
      v-if="!dialog"
      :fab="fab"
      :icon='icon'
      :text="tooltipText"
      :small="small"
      :large="large"
      :clicked.sync="dialog"
    />
    <v-dialog v-model="dialog" max-width="960">
      <v-card flat class="homefone pa-4" v-if="dialog">
        <v-toolbar flat dense class="transparent ma-0 pa-0" height="48">
          <v-spacer />
          <v-icon large @click="dialog = false">
            $close
          </v-icon>
        </v-toolbar>

        <UpdateNote
          :key="ready"
          :lineRef="lineRef"
          :note.sync="local"
          :dialog.sync="dialog"
        />

      </v-card>
    </v-dialog>
  </span>
</template>

<script>

import { menuItems } from '@/configs'

export default {
  name: 'AddNote',

  components: {
    ButtonTooltip: () => import('@/components/ButtonTooltip.vue'),
    UpdateNote: () => import('@/components/UpdateNote.vue')
  },

  props: {
    lineRef: {
      type: String,
      required: false
    },

    note: {
      required: false
    },

    keyword: {
      default: ''
    },

    topic: {
      default: ''
    },

    icon: {
      default: menuItems[3].icon
    },

    fab: {
      default: false
    },

    small: {
      default: false
    },

    large: {
      default: false
    },

    tooltipText: {
      default: menuItems[3].text
    }
  },

  data: () => ({
    dialog: false,
    ready: 0,
    local: null
  }),

  watch: {
    dialog (val) {
      if (!val) return

      Object.assign(this, {
        local: {
          _id: Date.now().toString(),
          text: '',
          keywords: [],
          topics: [],
          refs: []
        }
      })

      const [keyword, topic] = [
        typeof this.keyword === 'string' ? this.keyword : this.keyword ? this.keyword._id : null,
        typeof this.topic === 'string' ? this.topic : this.topic ? this.topic._id : null
      ]

      this.lineRef && this.getLineKeywords()
        .then(() => this.getLineTopics())
        .then(() => Object.assign(this, { ready: ++this.ready }))

      this.lineRef && this.local.refs.push(this.lineRef)

      keyword &&
        !this.local.keywords.includes(keyword) &&
        this.local.keywords.push(keyword)

      topic &&
        !this.local.topics.includes(topic) &&
        this.local.topics.push(topic)
    },

    local: {
      deep: true,
      handler (data) {
        // const { _id, text, refs, topics, keywords } = data
        // this.$root.contentController.putNote({ _id, text, refs, topics, keywords })
        this.$emit('update:note', JSON.parse(JSON.stringify(data)))
      }
    }
  },

  methods: {
    async getLineKeywords () {
      const keywords = await this.$root.contentController.getKeywords(this.lineRef)
      Object.assign(this.local, { keywords })
      return true
    },

    async getLineTopics () {
      const topics = await this.$root.contentController.getLineTopics(this.lineRef)
      Object.assign(this.local, { topics: topics.map(topic => topic._id) })
      return true
    }
  }
}
</script>
