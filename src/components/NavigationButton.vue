<template>
  <v-btn
    text
    @click="callback"
    :color="color"
    :small="small"
  >
      <v-icon
        :small="small"
        :color="color"
        class="mx-2"
      >
        {{ iconLocal }}
      </v-icon>
      {{ text }}
  </v-btn>
</template>

<script>

const { getCommonText } = require('@/configs/language').default
const icons = {
  back: '$back',
  next: '$next'
}
const text = {
  back: 'buttonBack',
  next: 'buttonNext'
}

export default {
  name: 'NavigationButton',

  props: {
    lang: {
      type: String,
      default: 'ua'
    },
    icon: {
      type: String
    },
    color: {
      type: String,
      default: 'primary'
    },
    small: {
      type: Boolean,
      default: false
    },
    step: {
      type: Number,
      default: 2
    },
    dir: {
      type: String,
      default: 'back'
    }
  },

  computed: {
    iconLocal () {
      return this.icon || icons[this.dir]
    },

    text () {
      return getCommonText(this.lang, text[this.dir])
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
