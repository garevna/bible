<template>
  <v-dialog v-model="dialog" persistent width="360">
    <v-card color="homefone" elevation="12" class="text-center">
      <v-toolbar flat color="transparent">
        <v-toolbar-title class="font-weight-bold">{{ signIn.title }}</v-toolbar-title>
        <v-btn icon="$close" @click="dialog = false" />
      </v-toolbar>

      <v-window v-model="step" class="pa-4">
        <v-window-item :value="1">
          <v-text-field
            v-model="login"
            variant="outlined"
            :label="signIn.loginLabel"
            :loading="loginStatus === 'in-test' ? 'warning' : false"
            :append-inner-icon="loginStatus === 'not-tested' ? '$submit' : ''"
            :error-messages="loginStatus === 'invalid' ? signIn.loginErrorMessage : ''"
            @update:model-value="loginStatus = 'not-tested'"
            @click:append-inner="testLogin"
            @keyup.enter="testLogin"
          />

          <div class="text-right">
            <v-btn variant="text" color="buttons" append-icon="$send" @click="goToSignUp">
              {{ signIn.registrationButtonText }}
            </v-btn>
          </div>
        </v-window-item>

        <v-window-item :value="2">
          <v-text-field
            v-model="password"
            variant="outlined"
            :type="showPass ? 'text' : 'password'"
            :label="signIn.passwordLabel"
            :prepend-inner-icon="showPass ? 'mdi-eye' : 'mdi-eye-off'"
            append-inner-icon="$send"
            :loading="passwordStatus === 'in-test' ? 'warning' : false"
            :error-messages="passwordStatus === 'invalid' ? signIn.passwordErrorMessage : ''"
            @update:model-value="passwordStatus = 'not-tested'"
            @click:prepend-inner="showPass = !showPass"
            @click:append-inner="testPassword"
            @keyup.enter="testPassword"
          />

          <div class="text-left">
            <v-btn variant="text" color="buttons" prepend-icon="$back" @click="step = 1">
              {{ common.buttonBack }}
            </v-btn>
          </div>
        </v-window-item>
      </v-window>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'

type Status = 'not-tested' | 'in-test' | 'valid' | 'invalid'

const dialog = defineModel<boolean>({ default: false })
const emit = defineEmits<{ 'sign-up': [] }>()

const user = useUserStore()
const { common, signIn } = storeToRefs(useLanguageStore())

const step = ref(1)
const login = ref('')
const loginStatus = ref<Status>('not-tested')
const password = ref('')
const passwordStatus = ref<Status>('not-tested')
const showPass = ref(false)

watch(dialog, (open) => {
  if (!open) return
  step.value = 1
  password.value = ''
  loginStatus.value = passwordStatus.value = 'not-tested'
})

async function testLogin() {
  if (!login.value) return
  loginStatus.value = 'in-test'
  const exists = await user.testUserLogin(login.value.trim())
  loginStatus.value = exists ? 'valid' : 'invalid'
  if (exists) step.value = 2
}

async function testPassword() {
  if (!password.value) return
  passwordStatus.value = 'in-test'
  const valid = await user.testUserPassword(password.value)
  passwordStatus.value = valid ? 'valid' : 'invalid'
  if (valid) dialog.value = false
}

function goToSignUp() {
  dialog.value = false
  emit('sign-up')
}
</script>
