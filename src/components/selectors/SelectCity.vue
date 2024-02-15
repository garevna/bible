<template>
  <div>
    <v-autocomplete
      v-if="ukr"
      v-model="region"
      :items="regions"
      prepend-icon="mdi-map-search"
      label="Область"
    />

    <v-autocomplete
      :items="cities"
      :filter="filter"
      @change="cityChanged"
      :label="label || 'Місто'"
      prepend-icon="mdi-city"
      hide-no-data
      :disabled="ukr && !region"
    />
  </div>
</template>

<script>

import { mapState, mapActions } from 'vuex'

export default {
  name: 'SelectCity',

  props: ['country', 'selected', 'label'],

  data: () => ({
    region: null
  }),

  computed: {
    ...mapState('firebase', ['catalog']),

    regions () {
      return this.catalog.regions
    },
    cities () {
      return this.catalog.cities
    },

    ukr () {
      return this.country === 'Україна' || this.country === 'Ukraine'
    }
  },

  watch: {
    region (val) {
      console.log('Region:', val)
      this.getRegionCites(val)
    },

    country (val) {
      if (!this.ukr) {
        this.region = null
        this.getCities(val)
      } else {
        this.getRegions()
      }
    }
  },

  methods: {
    ...mapActions('firebase', ['getRegions', 'getRegionCites', 'getCities']),

    filter (item, query) {
      return item.toLowerCase().indexOf(query.toLowerCase()) > -1
    },

    cityChanged (city) {
      this.$emit('update:selected', city)
    }
  }
}
</script>
