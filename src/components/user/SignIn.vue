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
          <b class="ml-4"> {{ _signIn.title }} </b>
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
              :label="_signIn.loginLabel"
              v-model="login"
              :append-icon="loginAppendIcon"
              @input="loginStatus = 'not-tested'"
              @click:append="testLogin(login)"
              :error-messages="loginStatus === 'invalid' ? _signIn.loginErrorMessage : ''"
              loading
            >
            <template v-slot:progress>
              <v-progress-linear
                v-show="loginStatus === 'in-test'"
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
                {{ _signIn.registrationButtonText }}
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
                :label="_signIn.passwordLabel"
                v-model="password"
                @input="passwordStatus = 'not-tested'"
                @click:prepend="showPass = !showPass"
                @click:append="testPassword(password)"
                :error-messages="passwordStatus === 'invalid' ? _signIn.passwordErrorMessage : ''"
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

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'SignIn',

  components: {
    NavigationButton
  },

  props: ['dialog', 'register'],

  data () {
    return {
      step: 1,
      login: '',
      loginStatus: 'not-tested',
      loginSubmited: false,
      showNewUserButton: false,
      password: '',
      passwordStatus: 'not-tested',
      showPass: false
    }
  },

  computed: {
    ...mapGetters('language', ['_signIn']),
    ...mapState('firebase', ['passwordValid']),
    ...mapGetters('firebase', ['loginExist']),

    loginAppendIcon () {
      return this.loginStatus === 'in-test'
        ? ''
        : this.loginStatus === 'not-tested'
          ? '$submit'
          : this.loginStatus === 'valid'
            ? '$send'
            : ''
    }
  },

  methods: {
    ...mapActions('firebase', ['testUserLogin', 'testUserPassword']),
    ...mapActions('user', ['signIn']),

    signUp () {
      this.$emit('update:register', true)
      this.$emit('update:dialog', false)
    },

    async testLogin (login) {
      this.loginStatus = 'in-test'

      await this.testUserLogin(login)

      this.loginStatus = this.loginExist ? 'valid' : 'invalid'

      this.step = this.loginExist ? 2 : 1
    },

    async testPassword (value) {
      this.passwordStatus = 'in-test'
      this.testUserPassword(value)
      this.passwordStatus = this.passwordValid ? 'valid' : 'invalid'
      await this.signIn()
      this.passwordValid && this.$emit('update:dialog', false)
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
