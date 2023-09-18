<template>
  <v-app>
    <Header :signIn.sync="login" :signUp.sync="register" />

    <v-progress-linear
      :active="progress"
      :indeterminate="progress"
      fixed
      style="top: 56px; z-index: 55"
      color="warning"
    />

    <v-main class="homefone">
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

      <v-card
        v-if="contentReady"
        flat
        class="transparent mx-auto"
        max-width="1440"
        height="100%"
      >
        <component :is="currentView" />
      </v-card>
    </v-main>

    <Footer :selected.sync="action" />
  </v-app>
</template>

<script>

import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'

import { footerMenu } from '@/configs'

// const { read } = require('@/firebase').default

export default {
  name: 'App',

  components: {
    Header,
    SignIn: () => import('@/components/SignIn.vue'),
    SignUp: () => import('@/components/SignUp.vue'),
    Home: () => import('@/views/Home.vue'),
    Keywords: () => import('@/views/Keywords.vue'),
    Topics: () => import('@/views/Topics.vue'),
    Notes: () => import('@/views/Notes.vue'),
    Footer
  },

  data: () => ({
    login: false,
    register: false,
    contentReady: false,
    progress: false,
    currentView: 'Home',
    action: 'bible',
    covenantIndex: undefined,
    books: [],
    bookIndex: 0,
    bookTitle: '',
    selectedMenuItem: null,
    event: null
  }),

  watch: {
    login (val) {
      console.log('SIGN IN: ', val)
    },

    register (val) {
      console.log('SIGN UP: ', val)
    },

    action (value) {
      console.log('Action changed: ', value)

      this.currentView = footerMenu.find(item => item.value === value)?.component
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
      if (!this.$root.user) console.warn('Sign in please to configure your own environment.')
      this.contentReady = true
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

    // window.addEventListener('user-sign-in', this.changeUser)
    // window.addEventListener('user-exit', this.changeUser)

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
    // window.removeEventListener('user-sign-in', this.changeUser)
    // window.removeEventListener('user-exit', this.changeUser)
  }
}
</script>

<style>

body {
  overflow: hidden;
}

.v-data-table__mobile-row__cell {
  text-align: left !important;
}

p {
  font-family: Arial;
  font-size: 14px;
  margin-bottom: 8px;
}

.covenant-name, .active-covenant-name {
  font-size: 13px;
  font-family: Arial;
}

.active-covenant-name {
  color: #900;
  font-weight: bold;
}

::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #20731C;
}
::-webkit-scrollbar-thumb {
  background: #4CAF50;
}
::-webkit-scrollbar-thumb:hover {
  background: #72BF44;
}
</style>
