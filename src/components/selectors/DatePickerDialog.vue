<template>
  <span>
    <v-tooltip top>
      <template v-slot:activator="{ on, attrs }">
        <v-icon
          :color="color"
          v-bind="attrs"
          v-on="on"
          class="mx-2"
          @click="dialog = true"
        >
          $calendar
        </v-icon>
      </template>
      <span> {{ _selector.datePrompt }} </span>
    </v-tooltip>

    <v-dialog v-model="dialog" width="320px">
      <v-date-picker
        v-model="localDate"
        :allowed-dates="isDateAvailable"
        scrollable
        :color="color"
        :first-day-of-week="1"
        locale="uk"
        @input="dialog = false"
      />
    </v-dialog>
  </span>
</template>

<script>

import { mapState, mapGetters } from 'vuex'

export default {
  name: 'DatePickerDialog',

  props: {
    date: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10)
    },

    dark: {
      type: Boolean,
      default: false
    },

    color: {
      default: 'buttons'
    }
  },

  data: () => ({
    dialog: false
  }),

  computed: {
    ...mapGetters('language', ['_selector']),
    ...mapState('notes', ['availableDates']),

    localDate: {
      get () {
        return this.date
      },
      set (val) {
        console.log(val)
        this.$emit('update:date', val)
      }
    }
  },

  methods: {
    isDateAvailable (dateISO) {
      return this.availableDates.includes(dateISO)
    }
  }
}
</script>

<style>

.v-picker {
  padding: 16px;
}
.v-date-picker-title__date {
  font-size: 24px !important;
  font-weight: bold;
}

.v-btn__content {
  font-weight: bold;
}
</style>
