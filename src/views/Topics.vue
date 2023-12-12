<template>
  <v-card flat class="transparent mx-auto my-7" max-width="600" v-if="ready">
    <v-toolbar flat class="transparent">
      <v-spacer />
      <TopicList
        :selectedTopic.sync="newTopic"
        :fab="true"
        icon="$addTopic"
        tooltipText="Додати тему"
      />
    </v-toolbar>

    <v-card flat class="transparent overflow-y-auto" :height="$root.viewportHeight - 240">

      <v-data-table
        :headers="headers"
        :items="topics"
        item-key="_id"
        class="transparent"
        hide-default-header
        hide-default-footer
        calculate-widths
        :items-per-page="-1"
        :no-data-text="noDataText"
      >

        <!-- <template v-slot:top>
          <v-divider />

          <v-divider />
        </template> -->

        <template v-slot:item.title="{ item }">
          <table width="100%">
            <tr>
              <td width="48">
                <v-icon
                  color="delete"
                  @click.stop="deleteTopic(item)"
                  class="mr-4"
                >
                  $delete
                </v-icon>
              </td>
              <td>
                <span
                  v-if="editMode !== item._id"
                  @click="showTopic(item)"
                >
                  {{ item.title }}
                </span>
                <v-text-field
                  v-else
                  v-model="item.title"
                  outlined
                  hide-details
                  dense
                  append-icon="$save"
                  @click:append="saveTopic(item)"
                />
              </td>
              <td width="48">
                <v-icon
                  v-if="editMode !== item._id"
                  class="ml-4"
                  color="primary"
                  @click.stop="editMode = item._id"
                >
                  $edit
                </v-icon>
              </td>
            </tr>
          </table>
        </template>
      </v-data-table>
    </v-card>
  </v-card>
</template>

<script>

import { footerMenu } from '@/configs'
const { deleteDocument } = require('@/firebase').default
const { getCommonText } = require('@/configs/language').default

export default {
  name: 'Topics',

  components: {
    TopicList: () => import('@/components/TopicList.vue')
  },

  data: () => ({
    noDataText: getCommonText('ua', 'noData'),
    title: footerMenu[3].text,
    ready: false,
    editMode: null,
    topics: [],
    headers: [
      // { text: '', value: 'actions', sortable: false },
      { text: '', value: 'title', width: '320' }
    ],
    newTopic: null
  }),

  watch: {
    topics: {
      deep: true,
      handler (data) {
        console.log('TOPIC LIST UPDATED:\n', data.map(item => `${item.title}\n`))
      }
    },
    newTopic (data) {
      data && data._id && this.add()
    }
  },

  methods: {
    showTopic (topic) {
      localStorage.setItem('page', 'topic')
      localStorage.setItem('topic', topic._id)
      this.$root.$emit('page-changed')
    },

    async deleteTopic (topic) {
      const index = this.topics.findIndex(item => item._id === topic._id)
      await deleteDocument('topics', topic._id)
      index !== -1 && this.topics.splice(index, 1)
    },

    async saveTopic (topic) {
      await this.$root.contentController.putTopic(topic)
      this.editMode = null
    },

    async getTopics () {
      this.ready = false
      this.topics = await this.$root.contentController.getTopics()
      this.$nextTick(() => { this.ready = true })
    },

    async add () {
      if (!this.newTopic._id) return
      const found = this.topics.find(topic => topic._id === this.newTopic._id)
      !found && this.topics.push(this.newTopic)
    }
  },

  mounted () {
    this.getTopics()
  }
}
</script>
