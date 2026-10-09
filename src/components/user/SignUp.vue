<template>
  <v-dialog v-model="dialog" persistent max-width="480">
    <v-card color="homefone" class="pa-2">
      <v-toolbar flat color="transparent">
        <v-toolbar-title class="font-weight-bold">{{ signUp.title }}</v-toolbar-title>
        <v-btn icon="$close" @click="dialog = false" />
      </v-toolbar>

      <v-window v-model="step" class="pa-4">
        <v-window-item :value="1">
          <UserNameAndAvatar v-model:user-name="userName" v-model:avatar="avatar" />
        </v-window-item>

        <v-window-item :value="2">
          <SelectCountry v-model="country" :label="signUp.userCountryLabel" />
        </v-window-item>

        <v-window-item :value="3">
          <SelectCity v-model="city" :country="country" />
        </v-window-item>

        <v-window-item :value="4">
          <v-text-field
            v-model="login"
            variant="outlined"
            :label="signUp.loginLabel"
            :loading="loginStatus === 'in-test' ? 'warning' : false"
            :append-inner-icon="loginStatus === 'not-tested' && login.trim() ? '$submit' : ''"
            :error-messages="loginStatus === 'invalid' ? signUp.loginErrorMessage : ''"
            @update:model-value="loginStatus = 'not-tested'"
            @click:append-inner="testLogin"
            @keyup.enter="testLogin"
          />
        </v-window-item>

        <v-window-item :value="5">
          <v-text-field
            v-model="password"
            variant="outlined"
            :type="showPass ? 'text' : 'password'"
            :label="signUp.passwordLabel"
            :prepend-inner-icon="showPass ? 'mdi-eye' : 'mdi-eye-off'"
            :error-messages="password && !strong ? signUp.passwordNotStrongEnough : ''"
            @click:prepend-inner="showPass = !showPass"
            @keyup.enter="strong && (step = 6)"
          />
        </v-window-item>

        <v-window-item :value="6">
          <v-text-field
            v-model="passwordDouble"
            variant="outlined"
            :type="showPass ? 'text' : 'password'"
            :label="signUp.doublePasswordLabel"
            :prepend-inner-icon="showPass ? 'mdi-eye' : 'mdi-eye-off'"
            :error-messages="
              passwordDouble && password !== passwordDouble ? signUp.passwordErrorMessage : createError
            "
            @click:prepend-inner="showPass = !showPass"
            @keyup.enter="create"
          />
        </v-window-item>
      </v-window>

      <div class="d-flex justify-space-between px-4 pb-2">
        <v-btn v-if="step > 1" variant="text" color="buttons" prepend-icon="$back" @click="step--">
          {{ signUp.back }}
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="step < 6"
          variant="text"
          color="buttons"
          append-icon="$next"
          :disabled="!canGoNext"
          @click="next"
        >
          {{ signUp.next }}
        </v-btn>
        <v-btn
          v-else
          variant="outlined"
          color="buttons"
          :disabled="!strong || password !== passwordDouble"
          :loading="creating"
          @click="create"
        >
          {{ signUp.registrationButtonText }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import SelectCity from '@/components/selectors/SelectCity.vue'
import SelectCountry from '@/components/selectors/SelectCountry.vue'
import UserNameAndAvatar from '@/components/user/UserNameAndAvatar.vue'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'

type Status = 'not-tested' | 'in-test' | 'valid' | 'invalid'

const dialog = defineModel<boolean>({ default: false })

const user = useUserStore()
const { signUp } = storeToRefs(useLanguageStore())

const step = ref(1)
const userName = ref('')
const avatar = ref('')
const country = ref('')
const city = ref('')
const login = ref('')
const loginStatus = ref<Status>('not-tested')
const password = ref('')
const passwordDouble = ref('')
const showPass = ref(false)
const creating = ref(false)
const createError = ref('')

/** at least 8 characters and one digit, as the hint says */
const strong = computed(() => password.value.length >= 8 && /\d/.test(password.value))

const canGoNext = computed(() => {
  if (step.value === 4)
    return (
      loginStatus.value === 'valid' || (loginStatus.value === 'not-tested' && Boolean(login.value.trim()))
    )
  if (step.value === 5) return strong.value
  return true
})

watch(dialog, (open) => {
  if (!open) return
  step.value = 1
  password.value = passwordDouble.value = createError.value = ''
  loginStatus.value = 'not-tested'
})

async function testLogin() {
  if (!login.value.trim()) return false
  loginStatus.value = 'in-test'
  const taken = await user.loginExists(login.value.trim())
  loginStatus.value = taken ? 'invalid' : 'valid'
  return !taken
}

async function next() {
  if (step.value === 4 && loginStatus.value !== 'valid' && !(await testLogin())) return
  step.value++
}

async function create() {
  if (!strong.value || password.value !== passwordDouble.value) return
  creating.value = true
  createError.value = ''

  const created = await user.createNewUser({
    login: login.value.trim(),
    password: password.value,
    userName: userName.value.trim(),
    avatar: avatar.value || undefined,
    country: country.value,
    city: city.value
  })

  creating.value = false
  if (created) dialog.value = false
  else createError.value = signUp.value.createError
}
</script>
