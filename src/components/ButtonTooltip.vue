<template>
  <v-tooltip top :color="color || 'buttons'">
    <template v-slot:activator="{ on, attrs }">
      <v-fab-transition v-if="fab">
        <v-btn
          fab
          dark
          :small="small"
          :large="large"
          :color="color || 'buttons'"
          absolute
          bottom
          style="top: 0"
          right
          v-bind="attrs"
          v-on="on"
          @click.stop="$emit('update:clicked', value || true)"
        >
          <v-icon>
            {{ icon }}
          </v-icon>
        </v-btn>
      </v-fab-transition>

      <v-icon
        v-else
        :small="small"
        :color="color || 'buttons'"
        v-bind="attrs"
        v-on="on"
        @click.stop="$emit('update:clicked', value || true)"
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
  name: 'ButtonTooltip',

  props: ['fab', 'icon', 'text', 'color', 'small', 'large', 'clicked', 'value'],

  methods: {
    callback () {
      this.$emit('update:clicked', this.value || true)
    }
  }
}
</script>
