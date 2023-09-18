<template>
  <!-- <v-container class="transparent"> -->
  <!-- <v-toolbar flat class="transparent" v-if="ready">
    <v-toolbar-title>
      <strong class="mr-4" style="color: #090">{{ title }}</strong>
    </v-toolbar-title>
      <v-spacer />
      <DatePicker :date.sync="date" :availableDates="availableDates" />
      <v-autocomplete
        v-model="topic"
        :items="topics"
        item-text="title"
        return-object
        append-icon="$submit"
        dense
        outlined
        label="Тема"
        no-data-text="Немає відповідних даних"
        @click:append="selectTopic($event)"
        :search-input.sync="search"
      />

    </v-toolbar> -->
  <v-toolbar flat class="transparent mt-5" v-if="ready">
    <v-app-bar-nav-icon @click="showMenuList = true" />
    <v-menu
      v-model="showMenuList"
      close-on-content-click
      absolute
      offset-y
      bottom
      style="max-width: 300px"
    >
      <!-- <template v-slot:activator="{ on, attrs }">
        <v-card
          class="portrait"
          img="https://cdn.vuetifyjs.com/images/cards/girl.jpg"
          height="300"
          width="600"
          v-bind="attrs"
          v-on="on"
        ></v-card>
      </template> -->

      <v-list dense>
        <v-list-item @click="tab = 1">
          <v-list-item-title>
            За датою
          </v-list-item-title>
        </v-list-item>
        <v-list-item @click="tab = 2">
          <v-list-item-title>
            За ключовими словами
          </v-list-item-title>
        </v-list-item>
        <v-list-item @click="tab = 3">
          <v-list-item-title>
            За темою
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

    <v-spacer />
    <!-- <v-tabs v-model="tab" class="transparent">
      <span v-if="$root.viewportWidth > 600">
        <v-tab>За датою</v-tab>
        <v-tab>За ключовими словами</v-tab>
        <v-tab>За темою</v-tab>
      </span>
      <span v-else>
        <v-tab>
          <v-icon> $calendar </v-icon>
        </v-tab>
        <v-tab>
          <v-icon> $keywords </v-icon>
        </v-tab>
        <v-tab>
          <v-icon> $topics </v-icon>
        </v-tab>
      </span>
    </v-tabs> -->
    <!-- <v-tabs-items v-model="tab" class="transparent">
      <v-tab-item> -->
        <v-card flat class="transparent mx-auto" v-if="tab === 1">
          <DatePicker :date.sync="date" :availableDates="availableDates" />
        </v-card>
      <!-- </v-tab-item>
      <v-tab-item> -->
        <v-card flat class="transparent mx-auto" v-if="tab === 2">
          <v-autocomplete
            v-model="keyword"
            :items="keywords"
            item-text="_id"
            dense
            outlined
            hide-selected
            label="Ключові слова"
            no-data-text="Немає відповідних даних"
            :search-input.sync="search"
          />
        </v-card>
      <!-- </v-tab-item>
      <v-tab-item> -->
        <v-card flat class="transparent mx-auto" v-if="tab === 3">
          <v-autocomplete
            v-model="topic"
            :items="topics"
            item-key="_id"
            item-text="title"
            dense
            outlined
            label="Тема"
            no-data-text="Немає відповідних даних"
            :search-input.sync="search"
          />
        </v-card>
      <!-- </v-tab-item>
    </v-tabs-items> -->
  </v-toolbar>
  <!-- </v-container> -->
</template>

<script>

import DatePicker from '@/components/DatePicker.vue'

export default {
  name: 'Selector',

  components: {
    DatePicker
  },

  props: ['selectedDate', 'selectedKeyword', 'selectedTopic'],

  data: () => ({
    tab: 1,
    showMenuList: false,
    search: '',
    availableDates: [],
    ready: false
  }),

  computed: {
    date: {
      get () {
        return this.selectedDate || new Date().toISOString().slice(0, 10)
      },
      set (val) {
        this.$emit('update:selectedDate', val)
        if (val) {
          this.topic = null
          this.keyword = null
        }
      }
    },

    keyword: {
      get () {
        return this.selectedKeyword || null
      },
      set (val) {
        this.$emit('update:selectedKeyword', val)
        if (val) {
          this.topic = null
          this.date = null
        }
      }
    },

    topic: {
      get () {
        return this.selectedTopic || null
      },
      set (val) {
        this.$emit('update:selectedTopic', val)
        if (val) {
          this.date = null
          this.keyword = null
        }
      }
    }
  },

  methods: {
    // selectTopic (item) {
    //   console.log(item)
    // },

    // selectItem (item) {
    //   console.log(item)
    //   this.$emit('update:selected', item.value || item.title || item.text || item)
    // }
  },

  async created () {
    const keys = await this.$root.contentController.getAllKeys('notes', 'date')
    console.log('AVAILABLE KEYS:\n', keys)
    this.availableDates = keys.status === 200
      ? keys.result.map(key => new Date(key - 0).toISOString().slice(0, 10))
      : []
    this.topics = await this.$root.contentController.getTopics()
    this.ready = true
  }
}
</script>

<style>

.theme--light.v-tabs > .v-tabs-bar {
  background: transparent;
}

.v-date-picker-title__date {
  font-size: 18px;
}
</style>
