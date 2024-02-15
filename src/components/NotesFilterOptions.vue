<template>
  <v-card flat class="transparent mt-2 mb-3 px-4">
    <v-chip v-if="selectedDate">
      {{ selectedDate || null }}
      <v-icon
        small
        @click="selectedDate = null"
        class="ml-2"
      >
        $reset
      </v-icon>
    </v-chip>

    <span v-if="selectedTopic._id" class="mx-5">
      <v-icon small class="mr-2">
        $topic
      </v-icon>
      <span @click="changeTopic = true">
        {{ selectedTopic.title }}
      </span>
      <v-icon small @click="selectedTopic = null">
        $reset
      </v-icon>
    </span>

    <span v-if="selectedKeyword">
      <v-chip>
        #{{ selectedKeyword }}
      </v-chip>
      <v-icon small @click="selectedKeyword = null">
        $reset
      </v-icon>
    </span>
  </v-card>
</template>

<script>

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'NotesFilterOptions',

  computed: {
    ...mapGetters('language', ['_selector']),
    ...mapState('notes', ['date', 'keyword', 'topic', 'availableDates']),

    selectedDate: {
      get () {
        return this.date
      },
      set (val) {
        this.updateDate(val)
      }
    },

    selectedKeyword: {
      get () {
        return this.keyword
      },
      set (val) {
        this.updateKeyword(val)
      }
    },

    selectedTopic: {
      get () {
        return this.topic || { id: null, title: '' }
      },

      set (data) {
        this.updateTopic(data || { id: null, title: '' })
      }
    }
  },

  methods: {
    ...mapActions('notes', ['updateDate', 'updateKeyword', 'updateTopic'])
  },

  mounted () {
    if (!this.selectedDate && !this.selectedKeyword && !this.selectedTopic) {
      console.log(this.availableDates.slice(-1)[0])
      this.updateDate(this.availableDates.slice(-1)[0])
    }
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
