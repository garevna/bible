<template>
  <v-app>
    <AppHeader v-model:sign-in="signInDialog" v-model:sign-up="signUpDialog" />

    <v-main class="bg-homefone">
      <SignIn v-model="signInDialog" @sign-up="signUpDialog = true" />
      <SignUp v-model="signUpDialog" />

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

const SignIn = defineAsyncComponent(() => import('@/components/user/SignIn.vue'))
const SignUp = defineAsyncComponent(() => import('@/components/user/SignUp.vue'))

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

const signInDialog = ref(false)
const signUpDialog = ref(false)

const view = computed(() => (app.currentView ? views[app.currentView as keyof typeof views] : null))

useVerseLinks()

watch(
  () => user.signed,
  (signed, wasSigned) => {
    if (signed) signInDialog.value = signUpDialog.value = false
    else if (wasSigned && app.page !== 'bible') app.setPage('bible')
  }
)

onMounted(() => {
  window.addEventListener('resize', app.changeViewport)
  app.init()
})

onBeforeUnmount(() => window.removeEventListener('resize', app.changeViewport))
</script>
