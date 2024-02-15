<template>
  <v-app :key="lang">
    <Header
      :signIn.sync="enter"
      :signUp.sync="register"
    />

    <v-progress-linear
      :active="progress"
      :indeterminate="progress"
      fixed
      style="top: 64px; z-index: 55"
      color="warning"
    />

    <v-main class="homefone overflow-y-auto">
      <SignIn :dialog.sync="enter" />
      <SignUp :dialog.sync="register" />

      <component :is="currentView" />
    </v-main>

    <Footer />

  </v-app>
</template>

<script>

import '@/sass/main.css'

import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'

import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  name: 'App',

  components: {
    Header,
    Footer,
    SignIn: () => import('@/components/user/SignIn.vue'),
    SignUp: () => import('@/components/user/SignUp.vue'),
    Home: () => import('@/views/Home.vue'),
    Keywords: () => import('@/views/Keywords.vue'),
    Topics: () => import('@/views/Topics.vue'),
    Topic: () => import('@/views/Topic.vue'),
    Notes: () => import('@/views/Notes.vue'),
    Search: () => import('@/views/Search.vue')
  },

  data: () => ({
    enter: false,
    register: false
  }),

  computed: {
    ...mapGetters(['currentView']),
    ...mapState(['viewportWidth', 'progress']),
    ...mapState('user', ['lang']),
    ...mapGetters('user', ['signed'])
  },

  watch: {
    signed (val) {
      if (!val) this.signOut()
    }
  },

  methods: {
    ...mapMutations(['changeViewport', 'setProgress']),
    ...mapActions(['init']),
    ...mapActions('user', ['signIn', 'signOut'])
  },

  async created () {
    await this.init()
  },

  mounted () {
    window.onresize = this.changeViewport
  },

  beforeDestroy () {
    window.onresize = null
  }
}
</script>
