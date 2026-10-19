<template>
  <!-- the 24-hour clock whatever the browser says (a field of the type time follows the system: AM/PM) -->
  <v-text-field
    v-bind="$attrs"
    :model-value="text"
    :placeholder="placeholder || '00:00'"
    inputmode="numeric"
    maxlength="5"
    autocomplete="off"
    prepend-inner-icon="mdi-clock-outline"
    @update:model-value="typed"
    @blur="finish"
    @click:clear="clear"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * A time 'HH:MM' on the 24-hour clock: the digits are typed, the colon comes by itself; "9" becomes
 * 09:00 and "930" 09:30 when the field is left. '' (or null) while there is none.
 */
defineOptions({ inheritAttrs: false })
const model = defineModel<string | null>({ default: '' })
defineProps<{ placeholder?: string }>()

const text = ref(model.value ?? '')
watch(model, (value) => (text.value = value ?? ''))

const valid = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

/** '1930' or '19:30' typed: '19:30' */
const shaped = (digits: string) => (digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits)

function typed(value: string | null) {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 4)
  text.value = shaped(digits)
  if (!digits) model.value = model.value === null ? null : ''
  else if (digits.length === 4 && valid(text.value)) model.value = text.value
}

/** the hours only, or the hours with the minutes: made whole when the field is left */
function finish() {
  const digits = text.value.replace(/\D/g, '')
  if (!digits) return
  const whole =
    digits.length <= 2
      ? `${digits.padStart(2, '0')}:00`
      : digits.length === 3
        ? `0${digits[0]}:${digits.slice(1)}`
        : shaped(digits)
  if (valid(whole)) model.value = text.value = whole
  else text.value = model.value ?? ''
}

function clear() {
  text.value = ''
  model.value = model.value === null ? null : ''
}
</script>
