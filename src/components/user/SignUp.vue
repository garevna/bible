<template>
  <v-dialog v-model="dialog" max-width="480">
    <NotMigrated name="SignUp" />
  </v-dialog>
</template>

<script setup lang="ts">
import NotMigrated from '@/components/NotMigrated.vue'

const dialog = defineModel<boolean>({ default: false })
</script>
