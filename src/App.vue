<template>
  <v-app>
    <AppHeader v-model:sign-in="signInDialog" v-model:sign-up="signUpDialog" />

    <v-main class="bg-homefone">
      <AuthDialog v-model="authOpen" v-model:tab="authTab" />
      <ChannelPostDialog />
      <HandoverBanner />
      <StatusRequestDialog />
      <StatusGrantedDialog />

      <component :is="view" v-if="view" />
    </v-main>

    <AppFooter />
  </v-app>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppFooter from '@/components/AppFooter.vue'
import AppHeader from '@/components/AppHeader.vue'
import { useVerseLinks } from '@/composables/useVerseLinks'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { useTranslationAccess } from '@/composables/useTranslations'
import { useWorkerStore } from '@/stores/worker'

const AuthDialog = defineAsyncComponent(() => import('@/components/user/AuthDialog.vue'))
const ChannelPostDialog = defineAsyncComponent(() => import('@/components/ChannelPostDialog.vue'))
const HandoverBanner = defineAsyncComponent(() => import('@/components/HandoverBanner.vue'))
const StatusRequestDialog = defineAsyncComponent(() => import('@/components/user/StatusRequestDialog.vue'))
const StatusGrantedDialog = defineAsyncComponent(() => import('@/components/user/StatusGrantedDialog.vue'))

const views = {
  Home: defineAsyncComponent(() => import('@/views/Home.vue')),
  Keywords: defineAsyncComponent(() => import('@/views/Keywords.vue')),
  Notes: defineAsyncComponent(() => import('@/views/Notes.vue')),
  Topics: defineAsyncComponent(() => import('@/views/Topics.vue')),
  Topic: defineAsyncComponent(() => import('@/views/Topic.vue')),
  Search: defineAsyncComponent(() => import('@/views/Search.vue')),
  Admin: defineAsyncComponent(() => import('@/views/Admin.vue')),
  Messages: defineAsyncComponent(() => import('@/views/Messages.vue')),
  Calendar: defineAsyncComponent(() => import('@/views/Calendar.vue')),
  Posts: defineAsyncComponent(() => import('@/views/Posts.vue'))
}

const app = useAppStore()
const user = useUserStore()

const authOpen = ref(false)
const authTab = ref<'sign-in' | 'sign-up'>('sign-in')

/** the header has separate sign in and sign up buttons; both open the same dialog */
const authButton = (value: 'sign-in' | 'sign-up') =>
  computed({
    get: () => authOpen.value && authTab.value === value,
    set: (open: boolean) => {
      authTab.value = value
      authOpen.value = open
    }
  })
const signInDialog = authButton('sign-in')
const signUpDialog = authButton('sign-up')

const view = computed(() => (app.currentView ? views[app.currentView as keyof typeof views] : null))

useVerseLinks()

watch(
  () => user.signed,
  (signed, wasSigned) => {
    if (signed) authOpen.value = false
    else if (wasSigned && app.page !== 'bible') app.setPage('bible')
  }
)

/** a minister sees the schedule of ministries first, once a session (the rights come from the worker a bit later) */
const worker = useWorkerStore()
// the translations that need a permission are for some people only
useTranslationAccess()

const LANDED = 'bible:calendar-landed'
watch(
  () => worker.canReceive,
  (minister) => {
    try {
      if (!minister || sessionStorage.getItem(LANDED)) return
      sessionStorage.setItem(LANDED, '1')
    } catch {
      return
    }
    if (app.page === 'bible') app.setPage('calendar')
  }
)

onMounted(() => {
  window.addEventListener('resize', app.changeViewport)
  app.init()
})

onBeforeUnmount(() => window.removeEventListener('resize', app.changeViewport))
</script>
