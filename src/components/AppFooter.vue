<template>
  <v-bottom-navigation v-if="user.signed" :model-value="activeMenu" bg-color="primary" grow>
    <v-btn v-for="item of menu" :key="item.value" :value="item.value" @click="app.setPage(item.value)">
      <v-icon>{{ item.icon }}</v-icon>
      <span>{{ pageTitle(item.value) }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { footerMenu } from '@/configs'
import { useAppStore } from '@/stores/app'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import type { Page } from '@/types'

const app = useAppStore()
const user = useUserStore()
const { pages } = storeToRefs(useLanguageStore())

/** 'topic' is opened from the topic list and has no item of its own */
const menu = footerMenu.filter((item) => item.value === item.menu)

const activeMenu = computed(() => footerMenu.find((item) => item.value === app.page)?.menu ?? 'bible')

const pageTitle = (page: Page) => (pages.value as Record<string, string>)[page] ?? ''
</script>
