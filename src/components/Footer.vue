<template>
  <v-bottom-navigation
    v-if="signed"
    app
    class="primary"
    dark
    v-model="view"
    fixed
    active-class="active-menu-item"
  >
    <v-btn
      v-for="item of footerMenu"
      :key="item.value"
      :value="item.value"
      :style="{ display: showItem(item) ? 'inline-flex' : 'none' }"
      @click.stop="setPage(item.value)"
    >
      <!-- <span>{{ item.text }}</span> -->
      <span>{{ _pages[item.value] }}</span>
      <v-icon>{{ item.icon }}</v-icon>
    </v-btn>
  </v-bottom-navigation>
</template>

<script>

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'Footer',

  data: () => ({
    view: null
  }),

  computed: {
    ...mapGetters('language', ['_pages']),
    ...mapState(['footerMenu', 'page', 'action']),
    ...mapGetters('user', ['signed'])
  },

  methods: {
    ...mapActions(['setPage']),

    showItem (item) {
      return item.value === item.menu && item.value !== this.action
    }
  }
}
</script>

<style scoped>

.active-menu-item {
  display: none;
}
</style>
