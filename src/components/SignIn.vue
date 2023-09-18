<template>
  <v-dialog
    v-model="dialog"
    persistent
    width="360"
    height="200"
    class="transparent"
  >
    <v-card elevation="12" class="homefone text-center">
      <v-toolbar flat class="transparent">
        <v-toolbar-title>
          <b> {{ getText('title') }} </b>
        </v-toolbar-title>

        <v-spacer />

        <v-btn icon @click="$emit('update:dialog', false)">
          <v-icon>$close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-stepper class="transparent" v-model="step" style="box-shadow: none;">
        <v-stepper-items>
          <v-stepper-content :step="1">
            <v-text-field
              outlined
              color="success"
              :label="getText('loginLabel')"
              v-model="login"
              :append-icon="loginAppendIcon"
              @input="loginChanged"
              @click:append="testLogin"
              :error-messages="loginErrorMessages"
              loading
            >
            <template v-slot:progress>
              <v-progress-linear
                v-show="loginSubmited"
                color="warning"
                indeterminate
                absolute
              />
            </template>
            </v-text-field>

            <v-row justify="end" align="start">
              <v-btn
                text
                color="buttons"
                @click="signUp"
              >
                {{ getText('registrationButtonText') }}
                <v-icon color="primary" class="ml-2">
                  $send
                </v-icon>
              </v-btn>
            </v-row>

            </v-stepper-content>

            <v-stepper-content :step="2">
              <v-text-field
                outlined
                :prepend-icon="showPass ? 'mdi-eye' : 'mdi-eye-off'"
                append-icon="$send"
                :type="showPass ? 'text' : 'password'"
                color="success"
                :label="getText('passwordLabel')"
                v-model="password"
                 @click:prepend="showPass = !showPass"
                 @click:append="testPassword(password)"
                 :error-messages="passwordErrorMessages"
              />

              <v-row justify="start" align="start">
                <NavigationButton dir="back" :step.sync="step" />
              </v-row>
            </v-stepper-content>
          </v-stepper-items>
        </v-stepper>
    </v-card>
  </v-dialog>
</template>

<style scoped>
</style>

<script>

import NavigationButton from '@/components/NavigationButton.vue'

const { getFirebaseUser } = require('@/firebase').default

export default {
  name: 'SignIn',

  components: {
    NavigationButton
  },

  props: ['dialog', 'register', 'lang'],

  data () {
    return {
      step: 1,
      login: '',
      loginSubmited: false,
      loginValid: false,
      showNewUserButton: false,
      loginErrorMessages: '',
      passwordErrorMessages: '',
      password: '',
      showPass: false,
      userCreds: null
    }
  },

  computed: {
    valid () {
      const hash = require('hash.js').sha256().update(this.password).digest('hex')
      return this.userCreds && this.userCreds.password === hash
    },

    loginError () {
      return !!this.userCreds && this.userCreds.login === this.login
    },

    loginAppendIcon () {
      return !this.login
        ? ''
        : !this.loginSubmited
          ? '$submit'
          : this.loginValid
            ? '$send'
            : ''
    }
  },

  watch: {
    lang (val) {
      const { getSignInText } = require('@/configs/language').default
      this.getText = getSignInText.bind(null, val)
    }
  },

  methods: {
    getFirebaseUser,

    getText: () => null,

    signUp () {
      this.$emit('update:register', true)
      this.$emit('update:dialog', false)
    },

    loginChanged () {
      this.loginSubmited = false
      this.loginErrorMessages = ''
    },

    async testLogin () {
      this.progress = true
      this.loginSubmited = true

      this.userCreds = await this.getFirebaseUser(this.login)

      this.loginValid = this.userCreds !== 404

      this.loginErrorMessages = !this.loginValid ? this.getText('loginErrorMessage') : ''

      this.$nextTick(() => { this.loginSubmited = false })

      this.step = this.loginValid ? 2 : 1
    },

    async testPassword (value) {
      const passwordHash = require('hash.js').sha256().update(value).digest('hex')

      if (this.userCreds.password !== passwordHash) {
        this.passwordErrorMessages = this.getText('passwordErrorMessage')
        return
      }

      this.passwordErrorMessages = ''

      await this.$root.contentController.setUser(this.userCreds)
      this.$emit('update:dialog', false)
    }
  },

  created () {
    const { getSignInText } = require('@/configs/language').default
    this.getText = getSignInText.bind(null, this.lang)
  }
}
</script>

<style>
.v-stepper__wrapper {
  padding: 16px 0 4px 0;
}

.v-stepper__content {
  padding: 0 24px 24px 24px;
}
</style>

<style scoped>
  .reset-password {
    font-size: 12px;
    margin-top: -16px;
    text-transform: none;
  }
  @media screen and (max-widt: 420px) {
    * {
      font-size: 14px;
    }
    .reset-password {
      font-size: 11px;
    }
  }
</style>
