<template>
  <!-- the country (its flag and calling code) and the number; the model is '+380501234567' or '' -->
  <div class="phone-input">
    <v-autocomplete
      v-model="country"
      :items="countries"
      :label="text.country"
      :disabled="disabled"
      density="compact"
      hide-details
      auto-select-first
      class="phone-input__country"
    >
      <template #selection="{ item }">{{ item.raw.flag }} +{{ item.raw.code }}</template>
    </v-autocomplete>
    <v-text-field
      v-model="national"
      :label="text.phone"
      :disabled="disabled"
      type="tel"
      inputmode="tel"
      autocomplete="tel-national"
      density="compact"
      hide-details
      class="phone-input__number"
    >
      <template v-if="national" #append-inner>
        <v-icon
          :icon="valid ? 'mdi-check-circle' : 'mdi-close-circle'"
          :color="valid ? 'primary' : 'delete'"
          :aria-label="valid ? text.valid : text.invalid"
        />
      </template>
    </v-text-field>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode
} from 'libphonenumber-js'

import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'

/** A mobile number, checked with libphonenumber-js (as in the client-side app) */
const phone = defineModel<string>({ default: '' })
const valid = defineModel<boolean>('valid', { default: false })
defineProps<{ disabled?: boolean }>()

const user = useUserStore()
const { header: text } = storeToRefs(useLanguageStore())

/** 'UA' -> 🇺🇦 */
const flagOf = (code: string) => String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)))

const countries = computed(() => {
  const locale = { ua: 'uk', ru: 'ru', en: 'en' }[user.lang]
  const names = new Intl.DisplayNames([locale], { type: 'region' })
  const items = getCountries().map((value) => ({
    value,
    code: getCountryCallingCode(value),
    flag: flagOf(value),
    title: `${flagOf(value)} ${names.of(value) ?? value} +${getCountryCallingCode(value)}`
  }))
  // Ukraine first, the others in the order of their names
  return items.sort((a, b) =>
    a.value === 'UA' ? -1 : b.value === 'UA' ? 1 : a.title.slice(5).localeCompare(b.title.slice(5))
  )
})

const country = ref<CountryCode>('UA')
const national = ref('')

// the model shown in the fields (e.g. a saved number)
watch(
  phone,
  (value) => {
    const parsed = value ? parsePhoneNumberFromString(value) : undefined
    if (!parsed) return
    if (parsed.country) country.value = parsed.country
    national.value = parsed.nationalNumber
  },
  { immediate: true }
)

const parsed = computed(() =>
  national.value ? parsePhoneNumberFromString(national.value, country.value || 'UA') : undefined
)

watch(
  parsed,
  (number) => {
    valid.value = Boolean(number?.isValid())
    const value = number?.isValid() ? number.number : ''
    if (value !== phone.value && (value || !national.value)) phone.value = value
  },
  { immediate: true }
)
</script>

<style scoped>
.phone-input {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.phone-input__country {
  flex: 0 0 150px;
}

.phone-input__number {
  flex: 1 1 200px;
}
</style>
