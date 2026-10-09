<template>
  <span v-if="user.signed" class="d-flex align-center">
    <v-tooltip :text="user.displayName">
      <template #activator="{ props }">
        <v-avatar v-bind="props" size="32" color="secondary" class="user-avatar mr-2">
          <v-img v-if="user.avatar && !broken" :src="user.avatar" cover @error="broken = true" />
          <span v-else class="initials">{{ user.initials }}</span>
        </v-avatar>
      </template>
    </v-tooltip>

    <v-tooltip :text="header.signOut">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="$signOut"
          size="small"
          :aria-label="header.signOut"
          @click="user.signOut()"
        />
      </template>
    </v-tooltip>
  </span>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'

const user = useUserStore()
const { header } = storeToRefs(useLanguageStore())

/** the photo could not be loaded: show the initials instead */
const broken = ref(false)
watch(
  () => user.avatar,
  () => (broken.value = false)
)
</script>

<style scoped>
.user-avatar {
  border: solid 2px #fffc;
}

.initials {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}
</style>
