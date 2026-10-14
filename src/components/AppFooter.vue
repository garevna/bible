<template>
  <v-bottom-navigation
    v-if="user.signed"
    :model-value="activeMenu"
    bg-color="primary"
    grow
    :height="low ? 40 : 56"
    class="app-footer"
  >
    <v-btn
      v-for="item of menu"
      :key="item.value"
      :value="item.value"
      :aria-label="pageTitle(item.value)"
      @click="app.setPage(item.value)"
    >
      <v-icon>{{ item.icon }}</v-icon>
      <span v-if="!low">{{ pageTitle(item.value) }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDisplay } from 'vuetify'

import { footerMenu } from '@/configs'
import { useAppStore } from '@/stores/app'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import type { Page } from '@/types'

const app = useAppStore()
const user = useUserStore()
const { pages } = storeToRefs(useLanguageStore())

/** a phone on its side: icons only, to leave room for the page */
const { height } = useDisplay()
const low = computed(() => height.value < 500)

/** 'topic' is opened from the topic list and has no item of its own */
// pages without an icon (a topic, the dashboard) are opened from other places
const menu = footerMenu.filter((item) => item.icon && item.value === item.menu)

const activeMenu = computed(() => footerMenu.find((item) => item.value === app.page)?.menu ?? 'bible')

const pageTitle = (page: Page) => (pages.value as Record<string, string>)[page] ?? ''
</script>

<style scoped>
/* five buttons fit a phone of 320px: no minimum width of 80px each, or the page gets wider than the screen */
.app-footer :deep(.v-bottom-navigation__content > .v-btn) {
  min-width: 0;
  padding: 0 4px;
}
</style>
