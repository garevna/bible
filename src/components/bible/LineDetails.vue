<template>
  <v-dialog
    id="line-details"
    v-model="dialog"
    transition="dialog-bottom-transition"
    :width="Math.min($root.viewportWidth, 900)"
    style="background: #fbfbfb"
  >
      <v-toolbar flat dark class="primary">
        <p class="shorted-text py-8">
          <v-icon class="mx-2">$verse</v-icon>
          {{ verse ? verse.verse : '' }}
        </p>
        <v-spacer />
        <v-btn icon @click="$emit('update:dialog', false)" class="mr-1">
          <v-icon>$close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-4">
        <v-btn-toggle v-model="tab" mandatory>
          <v-tooltip
            top
            v-for="(item, index) of tabs"
            :key="index"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                v-bind="attrs"
                v-on="on"
              >
                <v-icon large center :color="index === tab ? 'primary' : 'buttons'">
                  {{ item.icon }}
                </v-icon>
                <small v-if="tab === index"> {{ item.text }} </small>
              </v-btn>
            </template>
            <span> {{ item.text }} </span>
          </v-tooltip>
        </v-btn-toggle>

        <v-tabs-items v-model="tab" class="transparent">
          <v-tab-item>
            <EditKeywordList :lineRef="currentLineId" />
          </v-tab-item>

          <v-tab-item>
            <EditTopicList :lineRef="currentLineId" />
          </v-tab-item>

          <v-tab-item>
            <EditNoteList :lineRef="currentLineId" />
          </v-tab-item>
        </v-tabs-items>
      </v-card-text>
    <!-- </v-card> -->
  </v-dialog>
</template>

<script>

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'LineDetails',

  components: {
    EditKeywordList: () => import('@/components/keywords/EditKeywordList.vue'),
    EditTopicList: () => import('@/components/topics/EditTopicList.vue'),
    EditNoteList: () => import('@/components/notes/EditNoteList.vue')
  },

  props: ['dialog'],

  data: () => ({
    tab: 0
  }),

  computed: {
    ...mapGetters('language', ['_keywords', '_topics', '_notes']),
    ...mapState('content', ['verse', 'currentLineId']),

    tabs () {
      return [
        { icon: '$keywords', text: this._keywords.listHeader },
        { icon: '$topics', text: this._topics.listHeader },
        { icon: '$notes', text: this._notes.listHeader }
      ]
    }
  },

  watch: {
    currentLineId (val) {
      if (val) this.getData(val)
        // .then(() => Object.assign(this, { dialog: true }))
      // else this.reset()
    }
  },

  methods: {
    // ...mapMutations('content', ['setCurrentLineId']),
    ...mapActions('content', ['getLine', 'getLineNotes', 'getLineKeywords', 'getLineTopics']),
    ...mapActions('keywords', ['assignKeywordToCurrentVerse', 'removeKeywordFromVerse']),

    async getData (lineRef) {
      await Promise.all([this.getLineKeywords(lineRef), this.getLineTopics(lineRef), this.getLineNotes(lineRef)])
    }

    // async getData () {
    //   this.setCurrentLineId(this.currentLineId)
    //   const promises = ['getLine', 'getLineNotes', 'getLineKeywords', 'getLineTopics']
    //     .map(actionName => this[actionName](this.currentLineId))
    //   await Promise.all(promises)
    //
    //   console.log(this.verse)
    //   // await this.getLine(this.currentLineId)
    //   // await this.getLineNotes(this.currentLineId)
    //   // await this.getLineKeywords(this.currentLineId)
    //   // await this.getLineTopics(this.currentLineId)
    // },

    // reset () {
    //   this.setCurrentLineId(null)
    //   this.setCurrentLineId(null)
    //   this.dialog = false
    // }
  }
}
</script>

<style>
.v-dialog {
  background: #fbfbfb !important;
}
</style>

<style scoped>

.active-tab-class {
  font-weight: bold;
  color: #900 !important;
}

.v-tab {
  justify-content: start;
}

.v-tab--active {
  color: #efe !important;
}

.shorted-text {
  white-space: nowrap;
  width: calc(100% - 48px);
  overflow: hidden;
  text-overflow: ellipsis
}
</style>
