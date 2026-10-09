<template>
  <v-autocomplete
    v-model="country"
    :items="countries"
    item-title="show"
    item-value="name"
    :label="label"
    :loading="loading"
    prepend-inner-icon="mdi-web"
    variant="outlined"
    :custom-filter="filter"
    hide-no-data
  >
    <template #item="{ props, item }">
      <v-list-item v-bind="props">
        <template #prepend>
          <img :src="item.raw.flag" alt="" width="28" class="mr-3" />
        </template>
      </v-list-item>
    </template>
  </v-autocomplete>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface Country {
  name: string
  show: string
  flag: string
}

const country = defineModel<string>({ default: '' })
defineProps<{ label?: string }>()

const countries = ref<Country[]>([])
const loading = ref(false)

/** matches both the English name and the shown one ('Україна') */
const filter = (_value: string, query: string, item?: { raw: Country }) => {
  const search = query.toLowerCase()
  return Boolean(item && [item.raw.name, item.raw.show].some((name) => name.toLowerCase().includes(search)))
}

onMounted(async () => {
  loading.value = true
  try {
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name,flags')
    const data: { name: { common: string }; flags: { svg: string } }[] = await response.json()
    countries.value = data
      .map(({ name, flags }) => ({
        name: name.common,
        show: name.common === 'Ukraine' ? 'Україна' : name.common,
        flag: flags.svg
      }))
      .sort((a, b) => (a.name === 'Ukraine' ? -1 : b.name === 'Ukraine' ? 1 : a.show.localeCompare(b.show)))
  } catch (error) {
    console.warn('Failed to load countries', error)
  } finally {
    loading.value = false
  }
})
</script>
