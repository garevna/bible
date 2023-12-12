<template>
  <v-app>
    <Header
      :signIn.sync="login"
      :signUp.sync="register"
      :page="page"
    />

    <v-progress-linear
      :active="progress"
      :indeterminate="progress"
      fixed
      style="top: 56px; z-index: 55"
      color="warning"
    />

    <v-main class="homefone overflow-y-auto">
      <SignIn
        v-if="login"
        :dialog.sync="login"
        lang="ua"
      />

      <SignUp
        v-if="register"
        :dialog.sync="register"
        lang="ua"
      />

        <component v-if="contentReady" :is="currentView" />
    </v-main>

    <Footer :selected.sync="page" />

    <v-snackbar
      v-model="snackbar"
      :timeout="8000"
      color="warning"
      bottom
      right
    >
      Зареєструйтеся або увійдіть у систему, щоб мати можливість зберігати свої власні налаштування, нотатки, ключові слова та виділяти фрагменти текстів кольоровими маркерами
    </v-snackbar>
  </v-app>
</template>

<script>

import '@/sass/main.css'

import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'

import { footerMenu } from '@/configs'

const pages = footerMenu.map(item => ({ value: item.value, component: item.component }))

export default {
  name: 'App',

  components: {
    Header,
    Footer,
    SignIn: () => import('@/components/SignIn.vue'),
    SignUp: () => import('@/components/SignUp.vue'),
    Home: () => import('@/views/Home.vue'),
    Keywords: () => import('@/views/Keywords.vue'),
    Topics: () => import('@/views/Topics.vue'),
    Topic: () => import('@/views/Topic.vue'),
    Notes: () => import('@/views/Notes.vue'),
    Search: () => import('@/views/Search.vue')
  },

  data: () => ({
    login: false,
    register: false,
    contentReady: false,
    progress: false,
    covenantIndex: undefined,
    books: [],
    bookIndex: 0,
    bookTitle: '',
    selectedMenuItem: null,
    event: null,
    pages,
    page: null
  }),

  computed: {
    currentView () {
      return this.pages.find(item => item.value === this.page)?.component || 'Home'
    },

    snackbar: {
      get () {
        return !this.$root.user
      },
      set (val) {

      }
    }
  },

  methods: {
    setProgressOn () {
      this.progress = true
    },

    setProgressOff () {
      this.progress = false
    },

    setContentReady () {
      if (!this.$root.user) {
        console.warn('Sign in please to configure your own environment.')
        this.contentReady = true
      } else {
        const { read } = require('@/firebase').default
        read().then(() => { this.contentReady = true })
      }
    },

    resizeWindow () {
      Object.assign(this.$root, {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      })
    }
  },

  mounted () {
    window.onresize = function (event) {
      this.$emit('resize')
    }.bind(this.$root)

    this.$root.$on('progress-on', this.setProgressOn)
    this.$root.$on('progress-off', this.setProgressOff)
    this.$root.$on('content-ready', this.setContentReady)

    this.$root.$on('resize', this.resizeWindow)
  },

  beforeDestroy () {
    this.$root.$off('progress-on', this.setProgressOn)
    this.$root.$off('progress-off', this.setProgressOff)
    this.$root.$off('content-ready', this.setContentReady)

    this.$root.$off('resize', this.resizeWindow)
    window.onresize = null
  }
}
</script>
