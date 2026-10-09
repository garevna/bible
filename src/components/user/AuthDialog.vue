<template>
  <v-dialog v-model="dialog" max-width="480" scrollable>
    <v-card color="homefone" class="auth-card pt-2 pb-6">
      <div class="d-flex justify-end px-2">
        <v-btn
          icon="$close"
          variant="text"
          size="small"
          :aria-label="common.buttonBack"
          @click="dialog = false"
        />
      </div>

      <v-tabs v-model="tab" grow hide-slider class="px-8 mb-2" selected-class="auth-tab--active">
        <v-tab value="sign-in" class="auth-tab">{{ inText.title }}</v-tab>
        <v-tab value="sign-up" class="auth-tab">{{ upText.title }}</v-tab>
      </v-tabs>

      <v-card-text class="px-8">
        <v-window v-model="tab">
          <!-- sign in -->
          <v-window-item value="sign-in">
            <v-form class="mt-6" @submit.prevent="signIn">
              <v-text-field
                v-model="email"
                :placeholder="inText.loginLabel"
                autocomplete="username"
                prepend-icon="mdi-email-outline"
                :base-color="email && !emailOrLoginValid ? 'error' : undefined"
                clearable
                hide-details
                class="mb-4"
              />
              <PasswordField
                v-model="password"
                :placeholder="inText.passwordLabel"
                autocomplete="current-password"
              />

              <p class="text-center mt-2">
                <a class="forgot-link" href="#" @click.prevent="reset">{{ inText.forgotPassword }}</a>
              </p>

              <AuthMessage :message="message" :type="messageType" />

              <v-btn
                type="submit"
                class="auth-button mt-6"
                color="primary"
                block
                :loading="busy === 'password'"
                :disabled="!email?.trim() || !password"
              >
                {{ inText.submit }}
              </v-btn>
            </v-form>
          </v-window-item>

          <!-- sign up -->
          <v-window-item value="sign-up">
            <v-form class="mt-6" @submit.prevent="signUp">
              <v-text-field
                v-model="userName"
                :placeholder="upText.userNameLabel"
                prepend-icon="mdi-account-outline"
                hide-details
                class="mb-4"
              />
              <v-text-field
                v-model="email"
                type="email"
                :placeholder="upText.emailLabel"
                autocomplete="email"
                prepend-icon="mdi-email-outline"
                :error-messages="email && !emailValid ? upText.emailInvalid : ''"
                clearable
                hide-details="auto"
                class="mb-4"
              />
              <PasswordField
                v-model="password"
                :placeholder="upText.passwordLabel"
                autocomplete="new-password"
                :error="password && !strong ? upText.passwordNotStrongEnough : ''"
              />
              <PasswordField
                v-model="passwordDouble"
                :placeholder="upText.doublePasswordLabel"
                autocomplete="new-password"
                :error="passwordDouble && passwordDouble !== password ? upText.passwordErrorMessage : ''"
              />

              <AuthMessage :message="message" :type="messageType" />

              <v-btn
                type="submit"
                class="auth-button mt-6"
                color="primary"
                block
                :loading="busy === 'password'"
                :disabled="!emailValid || !strong || password !== passwordDouble"
              >
                {{ upText.registrationButtonText }}
              </v-btn>
            </v-form>
          </v-window-item>
        </v-window>

        <p class="text-center text-medium-emphasis my-5">{{ inText.or }}</p>

        <GoogleButton
          :text="tab === 'sign-in' ? inText.withGoogle : upText.withGoogle"
          :loading="busy === 'google'"
          @click="google"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AuthMessage from '@/components/user/AuthMessage.vue'
import GoogleButton from '@/components/user/GoogleButton.vue'
import PasswordField from '@/components/user/PasswordField.vue'
import { useLanguageStore } from '@/stores/language'
import { useUserStore, type AuthResult } from '@/stores/user'

export type AuthTab = 'sign-in' | 'sign-up'

/** Sign in and sign up: email + password or Google; users of the old version sign in with their login */
const dialog = defineModel<boolean>({ default: false })
const tab = defineModel<AuthTab>('tab', { default: 'sign-in' })

const user = useUserStore()
const { common, signIn: inText, signUp: upText } = storeToRefs(useLanguageStore())

const email = ref('')
const password = ref('')
const passwordDouble = ref('')
const userName = ref('')
const busy = ref<'password' | 'google' | null>(null)
const result = ref<AuthResult | 'reset-sent' | 'reset-needs-email' | null>(null)

const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value?.trim() ?? ''))
/** an email, or a login of the Vue 2 version (no @) */
const emailOrLoginValid = computed(() => emailValid.value || !email.value?.includes('@'))
/** at least 8 characters and one digit */
const strong = computed(() => password.value.length >= 8 && /\d/.test(password.value))

const message = computed(() => {
  switch (result.value) {
    case 'wrong-credentials':
      return inText.value.wrongCredentials
    case 'email-in-use':
      return upText.value.emailInUse
    case 'invalid-email':
      return upText.value.emailInvalid
    case 'weak-password':
      return upText.value.passwordNotStrongEnough
    case 'network':
      return inText.value.networkError
    case 'reset-sent':
      return inText.value.resetSent
    case 'reset-needs-email':
      return inText.value.resetNeedsEmail
    case 'error':
      return inText.value.unknownError
    default:
      return ''
  }
})
const messageType = computed(() => (result.value?.startsWith('reset') ? 'info' : 'error'))

watch(dialog, (open) => {
  if (!open) return
  password.value = passwordDouble.value = ''
  result.value = null
})

watch([tab, email, password], () => result.value?.startsWith('reset') || (result.value = null))

async function finish(action: Promise<AuthResult>, kind: 'password' | 'google') {
  busy.value = kind
  const outcome = await action
  busy.value = null
  if (outcome === 'ok') dialog.value = false
  else if (outcome !== 'cancelled') result.value = outcome
}

const signIn = () => finish(user.signIn(email.value, password.value), 'password')
const signUp = () =>
  finish(user.signUp(email.value, password.value, { userName: userName.value.trim() }), 'password')
const google = () => finish(user.signInWithGoogle(), 'google')

async function reset() {
  if (!emailValid.value) {
    result.value = 'reset-needs-email'
    return
  }
  const outcome = await user.resetPassword(email.value)
  // the same answer whether the email is registered or not
  result.value = outcome === 'network' ? 'network' : 'reset-sent'
}
</script>

<style scoped>
.auth-card {
  border-radius: 12px !important;
}

.auth-tab {
  border-radius: 10px 10px 0 0 !important;
  font-size: 17px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: normal;
  color: #888;
  border-bottom: solid 1px #ddd;
}

.auth-tab--active {
  background: rgb(0 144 176 / 10%);
  color: rgb(var(--v-theme-secondary));
  border-bottom: solid 2px rgb(var(--v-theme-secondary));
}

.auth-button {
  height: 52px !important;
  border-radius: 10px;
  font-size: 17px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: normal;
}

.forgot-link {
  font-size: 13px;
  color: #888;
}

.forgot-link:hover {
  color: rgb(var(--v-theme-secondary));
}
</style>
