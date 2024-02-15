<template>
  <span v-if="signed">
    <v-tooltip bottom>
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
      <span>{{ userName || login }}</span>
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
      <span>{{ _header.signOut }}</span>
    </v-tooltip>
  </span>
</template>

<script>

import { mapState, mapGetters, mapMutations } from 'vuex'

export default {
  name: 'User',

  computed: {
    ...mapGetters('language', ['_header']),
    ...mapState('user', ['login', 'userName']),
    ...mapGetters('user', ['signed', 'avatar'])
  },

  methods: {
    ...mapMutations('user', ['resetUser'])
  }
}
</script>
