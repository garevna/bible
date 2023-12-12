<template>
  <v-row
    class="bottom-border mt-2 mb-3 green-text px-4"
    justify="space-between"
    align="center"
  >
    <v-col cols="12" sm="3" md="2">
      <div v-if="!changeDate">
        <v-icon small class="green-text mr-2">
          {{ date ? '$dateSelected' : '$calendar'}}
        </v-icon>
        <span>
          <small v-if="date">
            <span
              @click="changeDate = true"
              class="green-text clickable-item"
            >
              {{ date }}
            </span>
            <v-icon
              small
              @click="date = null"
              class="green-text ml-2"
            >
              $reset
            </v-icon>
          </small>
          <small
            v-else
            @click="changeDate = true"
            class="green-text clickable-item empty-data"
          >
            Виберіть дату
          </small>
        </span>
      </div>
      <div v-else>
        <DatePicker
          :date.sync="date"
          :availableDates="availableDates"
        />
      </div>
    </v-col>

    <v-col cols="12" sm="6" md="6" lg="5">
      <div v-if="!changeTopic">
        <v-icon small class="green-text mr-2">
          $topic
        </v-icon>
        <span v-if="topic._id">
          <span @click="changeTopic = true">
            {{ topic.title }}
          </span>
          <v-icon
            class="green-text"
            small
            @click="topic = { _id: null, title: '' }"
          >
            $reset
          </v-icon>
        </span>
        <small
          v-else
          class="green-text clickable-item empty-data"
          @click="changeTopic = true"
        >
          Виберіть тему
        </small>
      </div>
      <div v-else>
        <SelectTopic :selected.sync="topic" />
      </div>
    </v-col>

    <v-col cols="12" sm="3" md="3">
      <div v-if="!changeKeyword">
        <span v-if="keyword">
          <v-chip small outlined color="deepgreen" class="green-text" @click="changeKeyword = true">
            #{{ keyword }}
          </v-chip>
          <v-icon
            class="green-text"
            small
            @click="keyword = ''"
          >
            $reset
          </v-icon>
        </span>
        <span v-else>
          <v-icon small class="green-text">
            $keyword
          </v-icon>
          <small class="green-text clickable-item empty-data" @click="changeKeyword = true">
            Виберіть ключове слово
          </small>
        </span>
      </div>
      <div v-else>
        <v-autocomplete
          v-model="keyword"
          :items="keywords"
          item-text="_id"
          dense
          outlined
          clearable
          prepend-icon="$keyword"
          hide-details
          label="Виберіть ключове слово"
          :no-data-text="noDataText"
          :search-input.sync="search"
        />
      </div>
    </v-col>
  </v-row>
</template>

<script>

import DatePicker from '@/components/DatePicker.vue'
import { getSelector, setSelector } from '@/helpers'

const { getCommonText } = require('@/configs/language').default

export default {
  name: 'Selector',

  components: {
    DatePicker,
    SelectTopic: () => import('@/components/SelectTopic.vue')
  },

  props: ['selectedDate', 'selectedKeyword', 'selectedTopic', 'title'],

  data: () => ({
    noDataText: getCommonText('ua', 'noData'),
    showMenuList: false,
    search: '',
    availableDates: [],
    keywords: [],
    ready: false,
    changeDate: false,
    changeTopic: false,
    changeKeyword: false
  }),

  computed: {
    date: {
      get () {
        return this.selectedDate || getSelector().date
      },
      set (val) {
        this.$emit('update:selectedDate', val)
        setSelector({ date: val })
        this.changeDate = false
      }
    },

    keyword: {
      get () {
        return this.selectedKeyword || getSelector().keyword
      },
      set (val) {
        this.$emit('update:selectedKeyword', val)
        setSelector({ keyword: val })
        this.changeKeyword = false
      }
    },

    topic: {
      get () {
        return {
          _id: this.selectedTopic._id || getSelector().topic._id,
          title: this.selectedTopic.title || getSelector().topic.title
        }
      },

      set ({ _id, title }) {
        this.$emit('update:selectedTopic', { _id, title })
        setSelector({ topic: { _id, title } })
      }
    }
  },

  watch: {
    topic: {
      deep: true,
      handler (data) {
        this.$nextTick(() => Object.assign(this, { changeTopic: false }))
      }
    }
  },

  async created () {
    Object.assign(this, getSelector())

    const keys = await this.$root.contentController.getAllKeys('notes', 'date')

    this.availableDates = keys.status === 200
      ? keys.result.map(key => new Date(key - 0).toISOString().slice(0, 10))
      : []

    this.keywords = await this.$root.contentController.getKeywords()

    if (!this.date && !this.keyword && !this.topic._id) {
      Object.assign(this, { date: this.availableDates.slice(-1)[0] })
    }

    this.ready = true
  }
}
</script>

<style scoped>

.clickable-item {
  cursor: pointer;
}

.green-text {
  color: #050;
}

.empty-data {
  opacity: 0.8;
}

.bottom-border {
  border-bottom: solid 1px #ddd;
}

</style>
