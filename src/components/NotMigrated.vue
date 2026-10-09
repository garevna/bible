<template>
  <v-alert type="info" variant="tonal" class="ma-8 mx-auto" max-width="600">
    {{ name }}: ця сторінка ще переноситься на Vue 3.
  </v-alert>
</template>

<script setup lang="ts">
defineProps<{ name: string }>()
</script>
