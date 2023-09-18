<template>
  <v-app-bar
    app
    flat
    color="primary"
    dark
    class="mx-0 px-0"
  >
    <v-card class="d-flex align-center justify-space-between transparent" flat tile width="100%" height="48">
      <div class="ml-5">
        <v-img
          :src="require('@/assets/logo.png')"
          class="logo my-3"
          contain
          width="40"
          height="48"
        />

          <span class="kcc-title"></span>
      </div>

      <v-spacer />

      <div class="mr-5">
        <User :signed.sync="signed" />

        <span v-if="!signed">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-icon
                dark
                class="mr-4"
                v-bind="attrs"
                v-on="on"
                @click="$emit('update:signIn', true)"
              >
                $signIn
              </v-icon>
            </template>
            <span>Вхід</span>
          </v-tooltip>

          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-icon
                dark
                v-bind="attrs"
                v-on="on"
                @click="$emit('update:signUp', true)"
              >
                $signUp
              </v-icon>
            </template>
            <span>Реєстрація</span>
          </v-tooltip>
        </span>
      </div>

      <v-tooltip bottom color="primary">
        <template v-slot:activator="{ on, attrs }">
          <v-avatar size="16" class="ml-2 rounded-0" v-bind="attrs" v-on="on">
            <v-img :src="require('@/assets/ukrainian.svg')" />
          </v-avatar>
        </template>
        <span>{{ translation }}</span>
      </v-tooltip>
    </v-card>
  </v-app-bar>
</template>

<script>

import User from '@/components/User.vue'

export default {
  name: 'Header',

  components: {
    User
  },

  props: ['signIn', 'signUp'],

  data: () => ({
    translation: 'Переклад І. Огієнка',
    signed: true
  }),

  watch: {
    signIn (val) {
      console.log('SIGN IN: ', val)
    },
    signUp (val) {
      console.log('SIGN UP: ', val)
    }
  },

  methods: {
    executeAction (actionName) {
      typeof this[actionName] === 'function' && this[actionName]()
    },

    logout () {
      this.signed = false
    },

    login () {
      this.signed = true
    }
  },

  created () {
    this.signed = Boolean(this.$root.user)
    this.$on('user-logout', this.logout)
    this.$on('user-login', this.login)
  },

  beforeDestroy () {
    this.$off('user-logout', this.logout)
    this.$off('user-login', this.login)
  }
}
</script>

<style>

.logo, .kcc-title {
  display: inline-block;
  vertical-align: middle;
  margin-right: 12px;
}

.kcc-title::after {
  content: 'Харківська християнська церква';
  font-weight: bold;
}

.translation-text::after {
  content: 'Переклад І. Огієнка'
}

@media screen and (max-width: 600px) {
  .kcc-title::after {
    content: 'ХXЦ';
  }
  .translation-text::after {
    content: ''
  }
}
</style>
