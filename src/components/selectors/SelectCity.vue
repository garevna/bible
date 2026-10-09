<template>
  <div>
    <v-autocomplete
      v-if="ukraine"
      v-model="region"
      :items="firebase.catalog.regions ?? []"
      :label="signUp.regionLabel"
      prepend-inner-icon="mdi-map-search"
      variant="outlined"
    />

    <v-autocomplete
      v-model="city"
      :items="firebase.catalog.cities ?? []"
      :label="signUp.userCityLabel"
      :disabled="ukraine && !region"
      prepend-inner-icon="mdi-city"
      variant="outlined"
      hide-no-data
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useFirebaseStore } from '@/stores/firebase'
import { useLanguageStore } from '@/stores/language'

/** Ukrainian cities come from the Firestore catalog by region, other countries from countriesnow.space */
const city = defineModel<string>({ default: '' })
const props = defineProps<{ country: string }>()

const firebase = useFirebaseStore()
const { signUp } = storeToRefs(useLanguageStore())

const region = ref<string | null>(null)
const ukraine = computed(() => ['Україна', 'Ukraine'].includes(props.country))

watch(
  () => props.country,
  (country) => {
    region.value = null
    city.value = ''
    firebase.catalog = { ...firebase.catalog, cities: null }
    if (!country) return
    ukraine.value ? firebase.getRegions() : firebase.getCities(country)
  },
  { immediate: true }
)

watch(region, (value) => value && firebase.getRegionCities(value))
</script>
