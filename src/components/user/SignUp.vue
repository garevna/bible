<template>
  <v-dialog
    v-model="dialog"
    persistent
    max-width="480"
    height="200"
    class="transparent"
  >
    <v-card flat class="homefone pa-2">
      <v-toolbar flat class="transparent">
        <v-toolbar-title>
          <b class="text--disabled ml-5">{{ _signUp.title }}</b>
        </v-toolbar-title>
        <v-spacer />

        <v-btn icon @click="$emit('update:dialog', false)">
          <v-icon>$close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-stepper class="transparent" v-model="step" style="box-shadow: none;">
        <v-stepper-items>
          <v-stepper-content :step="steps.userName">
            <UserNameAndAvatar
              :userName.sync="userName"
              :userPhoto.sync="avatar"
            />
            <v-card flat class="transparent text-center">
              <NavigationButton dir="next" :step.sync="step" class="d-inline-block" />
            </v-card>
          </v-stepper-content>

          <v-stepper-content :step="steps.country">
            <h5>{{ _signUp.userCountryLabel }}</h5>
            <SelectCountry :selected.sync="country" :label="_signUp.userCountryLabel" />

            <v-card flat class="transparent text-center">
              <NavigationButton dir="back" :step.sync="step" class="d-inline-block" />
              <NavigationButton dir="next" :step.sync="step" class="d-inline-block" />
            </v-card>
          </v-stepper-content>

          <v-stepper-content :step="steps.city">
            <SelectCity :country="country" :selected.sync="city" />
            <v-card flat class="transparent text-center">
              <NavigationButton dir="back" :step.sync="step" class="d-inline-block" />
              <NavigationButton dir="next" :step.sync="step" class="d-inline-block" />
            </v-card>
          </v-stepper-content>

          <v-stepper-content :step="steps.login">
            <v-text-field
              outlined
              color="success"
              :label="_signUp.loginLabel"
              v-model="login"
              :append-icon="loginAppendIcon"
              @input="loginStatus = 'not-tested'"
              @click:append="testLogin(login)"
              :error-messages="loginStatus === 'invalid' ? _signUp.loginErrorMessage : ''"
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

            <v-card flat class="transparent text-center">
              <NavigationButton dir="back" :step.sync="step" class="d-inline-block" />
              <NavigationButton
                dir="next"
                :step.sync="step"
                class="d-inline-block"
                v-if="loginStatus === 'valid'"
              />
            </v-card>
          </v-stepper-content>

          <v-stepper-content :step="steps.password">
            <v-text-field
              outlined
              :prepend-icon="showPass ? 'mdi-eye' : 'mdi-eye-off'"
              :append-icon="password.length > 6 ? '$send' : ''"
              :type="showPass ? 'text' : 'password'"
              color="success"
              :label="_signUp.passwordLabel"
              v-model="password"
              @click:prepend="showPass = !showPass"
              @click:append="step = 6"
              :error-messages="testPassword(password) ? '' : _signUp.passwordNotStrongEnough"
            />

            <v-card flat class="transparent text-center">
              <NavigationButton
                dir="back"
                :step.sync="step"
                class="d-inline-block"
              />
              <!-- <NavigationButton dir="next" :step.sync="step" class="d-inline-block" /> -->
            </v-card>
          </v-stepper-content>

          <v-stepper-content :step="steps.confirmPassword">
            <v-text-field
              outlined
              :prepend-icon="showPass ? 'mdi-eye' : 'mdi-eye-off'"
              :append-icon="password === passwordDouble ? '$send' : ''"
              :type="showPass ? 'text' : 'password'"
              color="success"
              :label="_signUp.doublePasswordLabel"
              v-model="passwordDouble"
              @click:prepend="showPass = !showPass"
              @click:append="createUser"
              :error-messages="password === passwordDouble ? '' : _signUp.passwordErrorMessage"
            />

            <v-card flat class="transparent text-center">
              <NavigationButton dir="back" :step.sync="step" class="d-inline-block" />
            </v-card>
          </v-stepper-content>
        </v-stepper-items>
      </v-stepper>
    </v-card>
  </v-dialog>
</template>

<style scoped>
</style>

<script>

import { mapGetters, mapActions } from 'vuex'

import NavigationButton from '@/components/NavigationButton.vue'

const regexp = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)/

const steps = {
  userName: 1,
  country: 2,
  city: 3,
  login: 4,
  password: 5,
  confirmPassword: 6
}

export default {
  name: 'SignUp',

  components: {
    UserNameAndAvatar: () => import('@/components/user/UserNameAndAvatar.vue'),
    SelectCountry: () => import('@/components/selectors/SelectCountry.vue'),
    SelectCity: () => import('@/components/selectors/SelectCity.vue'),
    NavigationButton
  },

  props: ['dialog'],

  data () {
    return {
      steps,
      step: 1,
      login: '',
      userName: '',
      avatar: '',
      city: '',
      country: '',
      loginStatus: 'not-tested',
      showNewUserButton: false,
      password: '',
      passwordDouble: '',
      showPass: false,
      userCreds: null
    }
  },

  computed: {
    ...mapGetters('language', ['_signUp']),
    ...mapGetters('firebase', ['loginExist']),

    passwordHash () {
      return require('hash.js').sha256().update(this.password).digest('hex')
    },

    loginAppendIcon () {
      return this.loginStatus === 'in-test'
        ? ''
        : this.loginStatus === 'not-tested'
          ? '$submit'
          : this.loginStatus === 'valid'
            ? '$send'
            : ''
    },

    progress () {
      return this.step === this.loginStatus === 'in-test'
    }
  },

  methods: {
    ...mapActions('firebase', ['testUserLogin', 'createNewUser']),

    async testLogin (login) {
      this.loginStatus = 'in-test'

      await this.testUserLogin(login)

      this.loginStatus = !this.loginExist ? 'valid' : 'invalid'

      this.step = this.loginExist ? this.steps.login : this.steps.password
    },

    testPassword (val) {
      return val.length >= 8 && regexp.test(val)
    },

    async createUser () {
      const { login, userName, avatar, passwordHash: password, city, country } = this
      await this.createNewUser({ login, userName, avatar, password, city, country })
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
