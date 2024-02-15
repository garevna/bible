<template>
  <v-btn
    text
    @click="callback"
    :color="color"
    :small="small"
  >
    <span v-if="dir === 'next'">
      {{ text }}
    </span>
    <v-icon
      :small="small"
      :color="color"
      class="mx-2"
    >
      {{ iconLocal }}
    </v-icon>
    <span v-if="dir === 'back'">
      {{ text }}
    </span>
  </v-btn>
</template>

<script>

import { mapGetters } from 'vuex'

const icons = {
  back: '$back',
  next: '$next'
}

export default {
  name: 'NavigationButton',

  props: {
    icon: {
      type: String
    },
    color: {
      type: String,
      default: 'buttons'
    },
    small: {
      type: Boolean,
      default: false
    },
    step: {
      type: Number,
      default: 1
    },
    dir: {
      type: String,
      default: 'back'
    }
  },

  computed: {
    ...mapGetters('language', ['_common']),

    iconLocal () {
      return this.icon || icons[this.dir]
    },

    text () {
      return this._common[this.dir === 'back' ? 'buttonBack' : 'buttonNext']
    }
  },

  methods: {
    callback () {
      const step = this.step + (this.dir === 'back' ? -1 : 1)
      this.$emit('update:step', step)
    }
  }
}
</script>
