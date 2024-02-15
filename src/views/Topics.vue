<template>
  <v-card flat class="transparent mx-auto my-7" max-width="600" :key="lang">
    <v-toolbar flat class="transparent">
      <v-spacer />
      <AddTopicToList
        :selectedTopic.sync="newTopic"
        :fab="true"
        icon="$addTopic"
        tooltipText="_topic.tooltipText"
      />
    </v-toolbar>

    <v-card flat class="transparent overflow-y-auto" :height="$root.viewportHeight - 240">

      <v-data-table
        :headers="headers"
        :items="topicList || []"
        item-key="_id"
        class="transparent"
        hide-default-header
        hide-default-footer
        calculate-widths
        :items-per-page="-1"
        :no-data-text="_common.noData"
      >
        <template v-slot:item.title="{ item }">
          <table width="100%">
            <tr>
              <td width="48">
                <v-icon
                  class="delete--text delete-icon mr-4"
                  @click.stop="deleteTopic(item._id)"
                >
                  $delete
                </v-icon>
              </td>
              <td>
                <span
                  v-if="editMode !== item._id"
                  @click="gotoTopic(item)"
                  style="cursor: pointer"
                >
                  {{ item.title }}
                </span>
                <v-text-field
                  v-else
                  v-model="item.title"
                  outlined
                  hide-details
                  dense
                  prepend-icon="$reset"
                  append-icon="$save"
                  @click:append="saveTopic(item)"
                  @click:prepend="editMode = undefined"
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

import '@/sass/delete.css'

import { footerMenu } from '@/configs'

import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  name: 'Topics',

  components: {
    AddTopicToList: () => import('@/components/topics/AddTopicToList.vue')
  },

  data: () => ({
    title: footerMenu[3].text,
    editMode: null,
    headers: [
      // { text: '', value: 'actions', sortable: false },
      { text: '', value: 'title', width: '320' }
    ],
    topic: null
  }),

  computed: {
    ...mapState(['lang']),
    ...mapGetters('language', ['_common', '_topic']),
    ...mapState('topics', ['topicList', 'newTopic'])
  },

  watch: {
    newTopic (data) {
      data && data._id && this.add()
    }
  },

  methods: {
    ...mapMutations('topics', ['setSelectedTopic']),
    ...mapActions('topics', ['getTopics', 'putTopic', 'deleteTopic', 'gotoTopic']),

    async saveTopic (topic) {
      await this.putTopic(topic)
      this.editMode = null
    },

    async add () {
      const found = this.list.find(topic => topic._id === this.newTopic._id)
      !found && this.topics.push(this.newTopic)
    }
  },

  async mounted () {
    await this.getTopics()
    console.log(this.topicList)
  }
}
</script>
