<template>
    <v-dialog v-model="dialog">
      <template v-slot:activator="{ on, attrs }">
        <ButtonTooltip
          :icon='buttonIcon'
          :text="buttonTooltipText"
          :small="true"
          v-bind="attrs"
          v-on="on"
          :clicked.sync="dialog"
        />
      </template>
      <v-card flat class="homefone pa-4" max-width="600">
        <v-toolbar flat dense class="transparent ma-0 pa-0" height="48">
          <KeywordList :lineRef="lineRef" />
          <TopicList :lineRef="lineRef" />

          <v-spacer />

          <v-icon large @click="dialog = false">
            $close
          </v-icon>
        </v-toolbar>

        <v-card flat class="transparent pa-8">
          <v-textarea
            v-model="noteText"
            auto-grow
            clearable
            outlined
            counter
            clear-icon="mdi-close-circle"
          />

          <v-btn outlined color="primary" @click="saveNote">
            Зберегти
          </v-btn>
        </v-card>
      </v-card>
    </v-dialog>
</template>

<script>

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import KeywordList from '@/components/KeywordList.vue'
import TopicList from '@/components/TopicList.vue'
import { menuItems } from '@/configs'

export default {
  name: 'AddNoteToLine',

  components: {
    ButtonTooltip,
    KeywordList,
    TopicList
  },

  props: ['lineRef'],

  data: () => ({
    dialog: false,
    note: {
      _id: Date.now().toString(),
      text: '',
      keywords: [],
      topics: [],
      refs: []
    },
    keywordClicked: false,
    topicClicked: false,
    keywords: [],
    topics: [],
    keyword: '',
    topic: '',
    noteText: '',
    search: '',
    ready: false,
    buttonTooltipText: menuItems[3].text,
    buttonIcon: menuItems[3].icon
  }),

  watch: {
    keyword (val) {
      console.log(val)
      // val && this.note.keywords.push(val)
    },

    topic (val) {
      console.log(val)
    }
  },

  methods: {
    async saveKeyword () {
      console.log(this.keyword, this.search)
      const word = this.keyword || this.search
      if (!word) return
      const { status, result: keyword } = await this.$root.contentController.getKeyword(word)
      const refs = status !== 200
        ? [this.lineRef]
        : !keyword.refs.includes(this.lineRef)
          ? keyword.refs.concat([this.lineRef])
          : null
      this.keywords.push({
        _id: word,
        refs
      })
      await this.$root.contentController.putKeyword(word, this.lineRef)
      // await this.$root.contentController.assignKeyword(word, this.lineRef)
      this.keyword = ''
      // this.$emit('update:dialog', false)
    },

    async saveNote () {
      if (!this.noteText) return
      await this.$root.contentController.putNote({
        _id: this._id,
        text: this.noteText,
        refs: this.lineRef ? [this.lineRef] : [],
        keywords: this.keywords || [],
        topics: this.topics || []
      })
      this.$emit('update:dialog', false)
      this.$nextTick(() => { this.noteText = '' })
    }
  },

  async created () {
    this.notes = await this.$root.contentController.getNotes({ lineRef: this.lineRef })
    this.note.refs.push(this.lineRef)
    console.log(this.note)
    this.ready = true
  }
}
</script>
