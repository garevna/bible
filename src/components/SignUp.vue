<template>
  <!-- <v-row justify="center" justify-md="end" class="mt-2"> -->
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
          <b>{{ getText('title') }}</b>
        </v-toolbar-title>
        <v-spacer />

        <v-btn icon @click="$emit('update:dialog', false)">
          <v-icon>$close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-stepper class="transparent" v-model="step" style="box-shadow: none;">
        <v-stepper-items>
          <v-stepper-content :step="1">
            <!-- <v-text-field
              outlined
              :label="getText('userNameLabel')"
              v-model="userName"
              append-icon="$send"
              @click:append="step = 2"
            /> -->

            <v-text-field
              outlined
              :label="getText('userNameLabel')"
              v-model="userName"
            />

            <v-text-field
              outlined
              :label="getText('userCityLabel')"
              v-model="city"
            />

            <v-text-field
              outlined
              :label="getText('userCountryLabel')"
              v-model="country"
            />

            <NavigationButton dir="next" :step.sync="step" />
          </v-stepper-content>

          <v-stepper-content :step="2">
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
                  v-show="progress"
                  color="warning"
                  indeterminate
                  absolute
                />
              </template>
            </v-text-field>
            <v-spacer />

            <NavigationButton dir="back" :step.sync="step" />
            <!-- <NavigationButton dir="next" :step.sync="step" /> -->
          </v-stepper-content>

          <v-stepper-content :step="3">
            <v-text-field
              outlined
              :prepend-icon="showPass ? 'mdi-eye' : 'mdi-eye-off'"
              :append-icon="password.length > 5 ? '$send' : ''"
              :type="showPass ? 'text' : 'password'"
              color="success"
              :label="getText('passwordLabel')"
              v-model="password"
              @click:prepend="showPass = !showPass"
              @click:append="step = 4"
              :error-messages="passwordErrorMessages"
            />

            <NavigationButton dir="back" :step.sync="step" />
          </v-stepper-content>

          <v-stepper-content :step="4">
            <v-text-field
              outlined
              :prepend-icon="showPass ? 'mdi-eye' : 'mdi-eye-off'"
              :append-icon="password === passwordDouble ? '$send' : ''"
              :type="showPass ? 'text' : 'password'"
              color="success"
              :label="getText('doublePasswordLabel')"
              v-model="passwordDouble"
              @click:prepend="showPass = !showPass"
              @click:append="createUser"
              :error-messages="password === passwordDouble ? '' : getText('passwordErrorMessage')"
            />

            <NavigationButton dir="back" :step.sync="step" />
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
import { user } from '@/helpers'

const { initFirebaseUser, createNewUser } = require('@/firebase').default

export default {
  name: 'SignUp',

  components: {
    NavigationButton
  },

  props: ['dialog', 'lang'],

  data () {
    return {
      step: 1,
      login: '',
      userName: '',
      city: '',
      country: '',
      loginSubmited: false,
      loginValid: false,
      showNewUserButton: false,
      loginErrorMessages: '',
      passwordErrorMessages: '',
      password: '',
      passwordDouble: '',
      showPass: false,
      userCreds: null
    }
  },

  computed: {
    passwordHash () {
      return require('hash.js').sha256().update(this.password).digest('hex')
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
    },

    getText () {
      const { getSignUpText } = require('@/configs/language').default
      return getSignUpText.bind(null, this.lang)
    },

    progress () {
      return this.step === 2 && this.loginSubmited
    }
  },

  methods: {
    initFirebaseUser,

    // getText: (() => ())(),

    loginChanged () {
      this.loginSubmited = false
      this.loginErrorMessages = ''
    },

    async testLogin () {
      this.loginSubmited = true

      const response = await this.initFirebaseUser(this.login)

      console.log('USER:\n', response)

      this.loginValid = response === 404

      this.loginErrorMessages = !this.loginValid ? this.getText('loginErrorMessage') : ''

      this.$nextTick(() => { this.loginSubmited = false })

      this.step = this.loginValid ? 3 : 2
    },

    async createUser () {
      const { login, userName, password, city, country } = this
      // console.log({ login: this.login, userName: this.userName, password: this.passwordHash })
      await createNewUser({ login, userName, city, country, password })
      user({ login, userName, password })
      Object.assign(this.$root, { user: { login, userName, password } })
      this.$emit('update:dialog', false)
    }
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
