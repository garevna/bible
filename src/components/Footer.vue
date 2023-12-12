<template>
  <v-bottom-navigation
    v-if="userExist"
    app
    class="primary"
    dark
    v-model="action"
    fixed
  >
    <v-btn
      v-for="item of items"
      :key="item.value"
      :value="item.value"
      :style="{ display: showItem(item) ? 'inline-flex' : 'none' }"
      @click.stop="setPage(item.value)"
    >
      <span>{{ item.text }}</span>
      <v-icon>{{ item.icon }}</v-icon>
    </v-btn>
  </v-bottom-navigation>
</template>

<script>

import { footerMenu } from '@/configs'

export default {
  name: 'Footer',

  props: ['selected'],

  data: () => ({
    items: footerMenu,
    action: null,
    userExist: false
  }),

  methods: {
    getPage () {
      const page = localStorage.getItem('page') || 'bible'
      this.action = page === 'topic' ? 'topics' : page

      this.$emit('update:selected', page)
    },

    setPage (page) {
      localStorage.setItem('page', page)
      this.$emit('update:selected', page)
    },

    userChanged (user) {
      this.userExist = Boolean(this.$root.user)
      if (!this.userExist) {
        this.setPage('bible')
        this.getPage()
      }
    },

    showItem (item) {
      return item.value === item.menu && item.value !== this.action
    }
  },

  mounted () {
    this.userExist = Boolean(this.$root.user)
    this.userExist && this.getPage()

    this.$root.$on('page-changed', this.getPage)
    this.$root.$on('user-changed', this.userChanged)
  },

  beforeDestroy () {
    this.$root.$off('page-changed', this.getPage)
    this.$root.$off('user-changed', this.userChanged)
  }
}
</script>
