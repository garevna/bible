<template>
  <div style="width: 180px; text-align: center">
    <ButtonTooltip
      v-for="menuItem of menuItems"
      :key="menuItem.value"
      :icon="menuItem.icon"
      :text="menuItem.text"
      :small="true"
      :line="lineRef"
      :click="$emit('update:selected', menuItem.value)"
    />
  </div>
</template>

<script>

import ButtonTooltip from '@/components/ButtonTooltip.vue'

import { menuItems } from '@/configs'

export default {
  name: 'LineButtons',

  components: {
    ButtonTooltip
  },

  props: ['lineRef', 'clicked', 'selected'],

  data: () => ({
    menuItems
  }),

  methods: {
    selectItem (item) {
      this.$emit('update:selected', this.lineRef)
      this.$emit('update:clicked', item.value)
    }
  }
}
</script>
