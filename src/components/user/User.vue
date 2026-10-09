<template>
  <span v-if="user.signed" class="d-flex align-center">
    <v-tooltip :text="user.userName || user.login || ''">
      <template #activator="{ props }">
        <v-avatar v-bind="props" size="32" class="mr-2" :image="user.avatar" />
      </template>
    </v-tooltip>

    <v-tooltip :text="header.signOut">
      <template #activator="{ props }">
        <v-btn v-bind="props" icon="$signOut" size="small" @click="user.signOut()" />
      </template>
    </v-tooltip>
  </span>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'

const user = useUserStore()
const { header } = storeToRefs(useLanguageStore())
</script>
