<template>
  <!-- the 24-hour clock whatever the browser says (a field of the type time follows the system: AM/PM) -->
  <v-menu v-model="open" :close-on-content-click="false" :open-on-click="false" location="bottom start">
    <template #activator="{ props: menu }">
      <v-text-field
        v-bind="{ ...$attrs, ...menu }"
        :model-value="text"
        :placeholder="placeholder || '00:00'"
        inputmode="numeric"
        maxlength="5"
        autocomplete="off"
        prepend-inner-icon="mdi-clock-outline"
        @update:model-value="typed"
        @blur="finish"
        @click:clear="clear"
        @click:prepend-inner="open = !open"
      />
    </template>

    <!-- the hours, then the minutes: round buttons, as the days of the calendar -->
    <v-card color="homefone" class="pa-3 clock">
      <div class="clock__grid clock__grid--hours">
        <button
          v-for="hour of HOURS"
          :key="hour"
          type="button"
          class="clock__item"
          :class="{ 'clock__item--chosen': hour === chosenHour }"
          :data-hour="hour"
          @click="pickHour(hour)"
        >
          {{ hour }}
        </button>
      </div>
      <div class="clock__grid clock__grid--minutes">
        <button
          v-for="minute of MINUTES"
          :key="minute"
          type="button"
          class="clock__item clock__item--minute"
          :class="{ 'clock__item--chosen': minute === chosenMinute }"
          :data-minute="minute"
          @click="pickMinute(minute)"
        >
          :{{ minute }}
        </button>
      </div>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * A time 'HH:MM' on the 24-hour clock: typed (the colon comes by itself; "9" becomes 09:00 and
 * "930" 09:30 when the field is left), or chosen by the clock icon. '' (or null) while there is none.
 */
defineOptions({ inheritAttrs: false })
const model = defineModel<string | null>({ default: '' })
defineProps<{ placeholder?: string }>()

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))

const open = ref(false)
const text = ref(model.value ?? '')
watch(model, (value) => (text.value = value ?? ''))

const chosenHour = computed(() => (model.value ?? '').slice(0, 2))
const chosenMinute = computed(() => (model.value ?? '').slice(3, 5))

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

/** an hour keeps the minutes chosen (or :00); a minute closes the clock */
const pickHour = (hour: string) => (model.value = `${hour}:${chosenMinute.value || '00'}`)
function pickMinute(minute: string) {
  model.value = `${chosenHour.value || '00'}:${minute}`
  open.value = false
}
</script>

<style scoped>
.clock {
  width: 300px;
}

.clock__grid {
  display: grid;
  gap: 4px;
  justify-items: center;
}

.clock__grid--hours {
  grid-template-columns: repeat(6, 1fr);
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: solid 1px var(--app-border);
}

.clock__grid--minutes {
  grid-template-columns: repeat(6, 1fr);
}

.clock__item {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  font-size: 15px;
  color: var(--app-text);
  transition: background 0.15s;
}

.clock__item--minute {
  font-size: 14px;
  color: rgb(var(--v-theme-secondary));
}

.clock__item:hover {
  background: var(--app-hover);
}

.clock__item--chosen {
  background: rgb(var(--v-theme-secondary));
  color: var(--app-on-secondary);
  font-weight: 700;
}
</style>
