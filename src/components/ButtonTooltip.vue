<template>
  <v-tooltip top>
    <template v-slot:activator="{ on, attrs }">
      <v-icon
        :small="small"
        :color="color || 'primary'"
        v-bind="attrs"
        v-on="on"
        @click.stop="callback"
        class="mx-2"
      >
        {{ icon }}
      </v-icon>
    </template>
    <span>{{ text }}</span>
  </v-tooltip>
</template>

<script>

export default {
  name: 'ButtonTooltip',

  props: ['icon', 'text', 'color', 'small', 'clicked'],

  methods: {
    callback () {
      this.$emit('update:clicked', true)
    }
  }
}
</script>
