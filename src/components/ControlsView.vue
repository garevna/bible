<template>
  <v-tooltip bottom color="secondary">
    <template v-slot:activator="{ on, attrs }">
      <v-icon
        color="secondary"
        v-bind="attrs"
        v-on="on"
        @click="show = !show"
      >
        {{ show ? '$hide' : '$show' }}
      </v-icon>
    </template>
    <span> {{ show ? 'Приховати елементи управління' : 'Показати елементи управління' }} </span>
  </v-tooltip>
</template>

<script>

export default {
  name: 'ControlsView',

  props: {
    showControls: {
      type: Boolean,
      default: true
    }
  },

  computed: {
    show: {
      get () {
        return this.showControls
      },
      set (val) {
        this.$emit('update:showControls', val)
      }
    }
  }
}
</script>
