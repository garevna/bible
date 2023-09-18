<template>
  <span v-if="signed">
    <v-tooltip bottom color="primary">
      <template v-slot:activator="{ on, attrs }">
        <v-avatar
          size="32"
          class="mr-4"
          v-bind="attrs"
          v-on="on"
        >
          <img :src="avatar">
        </v-avatar>
      </template>
      <span>{{ userName || 'Вхід' }}</span>
    </v-tooltip>
    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-icon
          dark
          v-bind="attrs"
          v-on="on"
           @click="resetUser"
        >
          $signOut
        </v-icon>
      </template>
      <span>Вихід</span>
    </v-tooltip>
  </span>
</template>

<script>

import { user } from '@/helpers'

export default {
  name: 'User',

  props: ['signed'],

  data: () => ({
    user: user()
  }),

  computed: {
    userName () {
      return this.user ? this.user.userName || this.user.login : null
    },

    avatar () {
      return this.user ? `https://ui-avatars.com/api/?name=${this.userName}` : null
    }
  },

  methods: {
    changeUser () {
      this.user = user()
      console.log('USER CHANGED:\n', this.user)
      if (this.user) {
        const { read } = require('@/firebase').default
        read().then(() => this.$emit('update:signed', true))
      } else this.$emit('update:signed', false)
    },

    resetUser () {
      this.$root.contentController.resetUser()
      this.$emit('update:signed', false)
    }
  },

  created () {
    window.addEventListener('user-changed', this.changeUser)
  },

  beforeDestroy () {
    window.removeEventListener('user-changed', this.changeUser)
  }
}
</script>
