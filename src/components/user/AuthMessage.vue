<template>
  <v-expand-transition>
    <v-alert v-if="message" :type="type" variant="tonal" density="compact" class="mt-4">
      {{ message }}
    </v-alert>
  </v-expand-transition>
</template>

<script setup lang="ts">
defineProps<{ message: string; type: 'info' | 'error' }>()
</script>
