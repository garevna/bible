<template>
  <div>
    <v-text-field v-model="userName" variant="outlined" :label="signUp.userNameLabel" />

    <div class="d-flex align-center ga-4">
      <v-file-input
        accept="image/*"
        variant="outlined"
        prepend-icon="mdi-camera"
        :label="signUp.avatarLabel"
        :error-messages="error"
        class="flex-grow-1"
        @update:model-value="pick"
      />
      <v-avatar size="100" :image="avatar || defaultAvatar" color="primary" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import { defaultAvatar } from '@/assets/default-avatar'
import { useLanguageStore } from '@/stores/language'
import { MAX_AVATAR_FILE_SIZE, resizeAvatar } from '@/utils/avatar'

const userName = defineModel<string>('userName', { default: '' })
const avatar = defineModel<string>('avatar', { default: '' })

const { signUp } = storeToRefs(useLanguageStore())

const error = ref('')

async function pick(value: File | File[] | null | undefined) {
  const file = Array.isArray(value) ? value[0] : value
  error.value = ''
  if (!file) return (avatar.value = '')

  if (!file.type.startsWith('image/')) return (error.value = signUp.value.avatarTypeError)
  if (file.size > MAX_AVATAR_FILE_SIZE) return (error.value = signUp.value.avatarSizeError)

  try {
    avatar.value = await resizeAvatar(file)
  } catch {
    error.value = signUp.value.avatarTypeError
  }
}
</script>
