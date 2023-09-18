<template>
  <v-dialog
    ref="dialog"
    v-model="modal"
    :return-value.sync="localDate"
    persistent
    width="320px"
  >
    <template v-slot:activator="{ on, attrs }">
      <v-text-field
        v-model="localDate"
        prepend-icon="mdi-calendar"
        readonly
        outlined
        dense
        clearable
        hide-details
        color="primary"
        v-bind="attrs"
        v-on="on"
        style="width: 180px"
      />
    </template>
    <v-date-picker
      v-model="localDate"
      :allowed-dates="isDateAvailable"
      scrollable
      no-title
      color="primary"
      :first-day-of-week="1"
      locale="uk"
      @input="modal = false"
    >
      <!-- <v-spacer />
      <v-btn
        text
        color="primary"
        @click="modal = false"
      >
        <strong>Скасувати</strong>
      </v-btn>
      <v-btn
        text
        color="primary"
        @click="$refs.dialog.save(date)"
      >
        <strong>OK</strong>
      </v-btn> -->
    </v-date-picker>
  </v-dialog>
</template>

<script>

export default {
  name: 'DatePicker',

  props: {
    date: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10)
    },
    availableDates: {
      type: Array,
      default: () => ([])
    }
  },

  data: () => ({
    modal: false
  }),

  computed: {
    dialog: {
      get () {
        return this.open
      },
      set (val) {
        this.$emit('update:open', val)
      }
    },
    localDate: {
      get () {
        return this.date
      },
      set (val) {
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
