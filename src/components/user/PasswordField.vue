<template>
  <v-text-field
    v-model="password"
    :type="show ? 'text' : 'password'"
    :placeholder="placeholder"
    :autocomplete="autocomplete"
    prepend-icon="mdi-key-variant"
    :append-inner-icon="show ? 'mdi-eye-off' : 'mdi-eye'"
    :error-messages="error || ''"
    hide-details="auto"
    class="mb-4"
    @click:append-inner="show = !show"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const password = defineModel<string>({ default: '' })
defineProps<{ placeholder: string; autocomplete: string; error?: string }>()

const show = ref(false)
</script>
