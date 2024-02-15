<template>
  <v-tooltip top>
    <template v-slot:activator="{ on, attrs }">
      <v-fab-transition>
        <v-btn
          fab
          dark
          :small="small"
          :large="large"
          :color="color"
          absolute
          bottom
          style="top: 0"
          right
          v-bind="attrs"
          v-on="on"
        >
          <v-icon>
            {{ icon }}
          </v-icon>
        </v-btn>
      </v-fab-transition>
    </template>

    <span> {{ text }} </span>
  </v-tooltip>
</template>

<script>

export default {
  name: 'ButtonFabTooltipImage',

  props: {
    icon: { default: '$add' },
    text: { default: '' },
    color: { default: 'buttons' },
    small: { default: false },
    large: { default: false }
  }
}
</script>
