<template>
  <v-autocomplete
    return-object
    :items="countries"
    :filter="filter"
    item-text="show"
    item-value="name"
    prepend-icon="mdi-web"
    @change="countryChanged"
    label="Країна"
    hide-no-data
  >
    <template v-slot:item="data">
      <v-avatar tile size="32" class="mr-2">
        <img :src="data.item.flag">
      </v-avatar>
      <span>{{ data.item.show }}</span>
    </template>
  </v-autocomplete>

</template>

<script>

export default {
  name: 'SelectCountry',

  props: ['selected'],

  data: () => ({
    countries: []
  }),

  methods: {
    filter (item, queryText, itemText) {
      const [search, name, show] = [queryText, item.name, item.show].map(item => item.toLowerCase())
      return name.indexOf(search) > -1 || show.indexOf(search) > -1
    },

    countryChanged (country) {
      country && this.$emit('update:selected', country.name)
    }
  },

  async created () {
    const response = await (await fetch('https://restcountries.com/v3.1/all?fields=name,flags,coatOfArms')).json()

    this.countries = response.map(country => ({
        name: country.name.common,
        show: country.name.common === 'Ukraine' ? 'Україна' : country.name.common,
        flag: country.flags.svg,
        herb: country.coatOfArms.svg
    }))
  }
}
</script>
