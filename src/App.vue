<template>
  <v-app>
    <AppHeader v-model:sign-in="signInDialog" v-model:sign-up="signUpDialog" />

    <v-main class="bg-homefone">
      <AuthDialog v-model="authOpen" v-model:tab="authTab" />

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

const AuthDialog = defineAsyncComponent(() => import('@/components/user/AuthDialog.vue'))

const views = {
  Home: defineAsyncComponent(() => import('@/views/Home.vue')),
  Keywords: defineAsyncComponent(() => import('@/views/Keywords.vue')),
  Notes: defineAsyncComponent(() => import('@/views/Notes.vue')),
  Topics: defineAsyncComponent(() => import('@/views/Topics.vue')),
  Topic: defineAsyncComponent(() => import('@/views/Topic.vue')),
  Search: defineAsyncComponent(() => import('@/views/Search.vue'))
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

onMounted(() => {
  window.addEventListener('resize', app.changeViewport)
  app.init()
})

onBeforeUnmount(() => window.removeEventListener('resize', app.changeViewport))
</script>
