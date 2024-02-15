<template>
  <v-card flat class="transparent">
    <v-text-field
      outlined
      :label="getText('userNameLabel')"
      v-model="name"
    />
    <v-row>
      <v-col cols="8" cols-md="9">
        <v-tooltip left>
          <template v-slot:activator="{ on, attrs }">
            <div v-bind="attrs" v-on="on">
              <v-file-input
                v-model="file"
                outlined
                prepend-icon="mdi-camera"
                persistent-hint
                :error="!validFile"
                :error-messages="errorMessages"
                :hint="getText('avatarLabel')"
                @change="getAvatar"
              />
            </div>
          </template>
          <span>{{ getText('avatarLabel') }}</span>
        </v-tooltip>
      </v-col>
      <v-col cols="4" cols-md="3">
        <DisplayAvatar :avatar="avatar" :size="100" alignImage="alignImage" />
        <!-- <div
          class="image-container"
          :style="`width: ${size}px; height: ${size}px`"
        >
          <img ref="avatar" class="croped-centered-image" />
        </div> -->
      </v-col>
    </v-row>
  </v-card>
</template>

<script>

import DisplayAvatar from '@/components/user/DisplayAvatar.vue'

const size = 100

export default {
  name: 'UserNameAndAvatar',

  components: {
    DisplayAvatar
  },

  props: ['userName', 'userPhoto', 'lang'],

  data: () => ({
    file: null,
    size,
    errorMessages: [],
    avatarReady: false
  }),

  computed: {
    name: {
      get () {
        return this.userName
      },
      set (val) {
        this.$emit('update:userName', val)
      }
    },

    avatar: {
      get () {
        return this.userPhoto
      },

      set (data) {
        this.$emit('update:userPhoto', data)
      }
    },

    getText () {
      const { getSignUpText } = require('@/configs/language').default
      return getSignUpText.bind(null, this.lang || 'ua')
    },

    validFile () {
      if (!this.file) return true
      this.file.type.indexOf('image')
        ? Object.assign(this, { errorMessages: [this.getText('avatarTypeError')] })
        : this.file.size > 524288000
          ? Object.assign(this, { errorMessages: [this.getText('avatarSizeError')] })
          : Object.assign(this, { errorMessages: [] })

      return !this.errorMessages.length
    }
  },

  methods: {
    getFile (file) {
      if (!file || !this.validFile) return { avatar: null, alignImage: 'center' }
      return new Promise(resolve => {
        const reader = Object.assign(new FileReader(), {
          onload: function (event) {
            const img = document.createElement('img')
            img.onload = function (event) {
              const { width, height } = img
              const alignImage = width > height ? 'baseline' : 'center'
              const [w, h] = width > height
                ? [width * size / height, size]
                : [size, height * size / width]
              const newX = Math.round((w - size) / 2)
              const canvas = document.createElement('canvas')
              Object.assign(canvas, { width: w, height: h })
              const ctx = canvas.getContext('2d')
              ctx.drawImage(img, newX, 0, width, height, 0, 0, w, h)
              const data = canvas.toDataURL(file)
              resolve({ avatar: data, alignImage })
            }
            img.src = event.target.result
          }
        })
        reader.readAsDataURL(file)
      })
    },

    async getAvatar (file) {
      const { avatar, alignImage } = await this.getFile(file)
      this.$emit('update:userPhoto', avatar)
      Object.assign(this, { alignImage, avatarReady: true })
    }
  }
}
</script>

<style>
.v-file-input .v-input__slot {
  visibility: hidden !important;
}
</style>
