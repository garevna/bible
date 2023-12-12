<template>
  <v-dialog
    id="line-details"
    v-model="details"
    transition="dialog-bottom-transition"
    :width="Math.min($root.viewportWidth, 900)"
  >
    <v-card flat class="homefone px-1 pt-0 pb-4">
      <v-toolbar flat class="transparent">
        <v-tabs v-if="$root.viewportWidth >= 600" v-model="tab" class="ml-2" active-class="active-tab-class">
          <v-tabs-slider color="#900" />
          <v-tab v-for="(item, index) of tabs" :key="index">
            <v-icon left :color="index === tab ? '#900' : 'primary'">
              {{ item.icon }}
            </v-icon>
            {{ item.text }}
          </v-tab>
        </v-tabs>
        <v-spacer />
        <v-btn icon @click="$emit('update:details', false)">
          <v-icon>$close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-4">
        <v-tabs vertical v-if="$root.viewportWidth < 600" v-model="tab" active-class="active-tab-class">
          <v-tabs-slider color="#900" />
          <v-tab v-for="(item, index) of tabs" :key="index">
            <v-icon left :color="index === tab ? '#900' : 'primary'">
              {{ item.icon }}
            </v-icon>
            {{ item.text }}
          </v-tab>
        </v-tabs>

          <v-tabs-items v-model="tab" class="transparent">
            <v-tab-item>
              <EditKeywordList :lineRef="lineRef" />
            </v-tab-item>

            <v-tab-item>
              <EditTopicList :lineRef="lineRef" />
            </v-tab-item>

            <v-tab-item>
              <EditNoteList :lineRef="lineRef" />
            </v-tab-item>
          </v-tabs-items>
        </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>

export default {
  name: 'LineDetails',

  components: {
    EditKeywordList: () => import('@/components/EditKeywordList.vue'),
    EditTopicList: () => import('@/components/EditTopicList.vue'),
    EditNoteList: () => import('@/components/EditNoteList.vue')
  },

  props: ['lineRef', 'details'],

  data: () => ({
    ready: false,
    line: null,
    note: null,
    notes: [],
    tabs: [
      { icon: '$keywords', text: 'Ключові слова' },
      { icon: '$topics', text: 'Теми' },
      { icon: '$notes', text: 'Нотатки' }
    ],
    tab: 0
  }),

  watch: {
    note (val) {
      val && this.$root.contentController.getNote(val)
        .then(note => this.notes.push(note))
    },

    lineRef: {
      immediate: true,
      handler (val) {
        val && this.getLine()
      }
    }
  },

  methods: {
    async getLine () {
      this.ready = false
      this.line = await this.$root.contentController.getLine(this.lineRef)
      this.ready = true
    },

    async getNotes () {
      const response = await this.$root.contentController.getNotes({ lineRef: this.lineRef })
      console.log('NOTES:\n', response)
      this.notes = response
    },

    removeKeyword (keyword) {
      this.keywords.splice(this.keywords.indexOf(keyword), 1)
    },

    changeTab (tab, index) {
      this.tabs.unshift(this.tabs.splice(index, 1)[0])
    }
  },

  mounted () {
    this.ready = false

    this.getLine()
      // .then(() => this.getAll())
      .then(() => Object.assign(this, { ready: true }))
  }
}
</script>

<style scoped>
.active-tab-class {
  font-weight: bold;
  color: #900 !important;
}
</style>

<style>
.v-tab {
  justify-content: start;
}

.v-tab--active {
  color: #efe !important;
}
</style>
