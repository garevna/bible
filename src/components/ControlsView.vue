<template>
  <v-tooltip bottom>
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
    <span> {{ show ? _showControls.hide : _showControls.show }} </span>
  </v-tooltip>
</template>

<script>

import { mapGetters } from 'vuex'

export default {
  name: 'ControlsView',

  props: {
    showControls: {
      type: Boolean,
      default: true
    }
  },

  computed: {
    ...mapGetters('language', ['_showControls']),
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
