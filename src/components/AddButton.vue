<template>
  <v-btn
    variant="tonal"
    color="buttons"
    :prepend-icon="icon"
    class="add-button text-none"
    @click="emit('click')"
  >
    {{ label }}
  </v-btn>
</template>

<script setup lang="ts">
/** The one style of the "add / create" buttons with a text */
defineProps<{ label: string; icon: string }>()
const emit = defineEmits<{ click: [] }>()
</script>

<style scoped>
.add-button {
  letter-spacing: normal;
  font-weight: 500;
}
</style>
