<template>
  <v-bottom-navigation
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
    items: footerMenu
  }),

  computed: {
    action: {
      get () {
        return this.selected || 'bible'
      },
      set (val) {
        this.$emit('update:selected', val)
      }
    }
  }
}
</script>
