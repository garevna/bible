<template>
  <v-tooltip top>
    <template v-slot:activator="{ on, attrs }">
      <v-icon
        :small="small"
        :color="color"
        v-bind="attrs"
        v-on="on"
        class="mx-2"
      >
        {{ icon }}
      </v-icon>
    </template>

    <span> {{ text }} </span>
  </v-tooltip>
</template>

<script>

export default {
  name: 'ButtonTooltipImage',

  props: {
    icon: { default: '$add' },
    text: { default: '' },
    color: { default: 'buttons' },
    small: { default: false },
    large: { default: false }
  }
}
</script>
