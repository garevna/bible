<template>
  <AppDialog v-model="open" :title="text.installTitle" icon="mdi-cellphone-arrow-down" max-width="520">
    <p class="lead">{{ text.installLead }}</p>

    <!-- Android: the browser installs by one button -->
    <div v-if="installPrompt" class="text-center my-4">
      <v-btn
        variant="flat"
        color="primary"
        size="large"
        class="text-none px-8"
        prepend-icon="mdi-download"
        @click="installNow"
      >
        {{ text.installButton }}
      </v-btn>
    </div>

    <!-- an iPhone: three steps in Safari -->
    <ol v-else-if="apple" class="steps">
      <li>
        {{ text.installAppleShare }}
        <v-icon icon="mdi-export-variant" size="small" class="ml-1" />
      </li>
      <li>{{ text.installAppleHome }} <v-icon icon="mdi-plus-box-outline" size="small" class="ml-1" /></li>
      <li>{{ text.installAppleAdd }}</li>
    </ol>

    <!-- another phone or browser: through the menu of the browser -->
    <ol v-else class="steps">
      <li>
        {{ text.installMenu }}
        <v-icon icon="mdi-dots-vertical" size="small" class="ml-1" />
      </li>
      <li>{{ text.installMenuItem }}</li>
    </ol>

    <p class="muted">{{ text.installSignedIn }}</p>

    <template #actions>
      <v-spacer />
      <v-btn variant="flat" color="primary" class="text-none px-6" @click="open = false">{{
        common.close
      }}</v-btn>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import { useLanguageStore } from '@/stores/language'
import { install, installPrompt, isApple } from '@/utils/install'

/** How to put the app on the home screen of the phone: one button on Android, simple steps elsewhere */
const open = defineModel<boolean>({ default: false })

const { header: text, common } = storeToRefs(useLanguageStore())
const apple = isApple()

async function installNow() {
  if (await install()) open.value = false
}
</script>

<style scoped>
.lead {
  font-size: 16px;
  line-height: 1.5;
}

.steps {
  padding-left: 22px;
  margin: 12px 0;
  font-size: 16px;
}

.steps li {
  margin-bottom: 10px;
}

.muted {
  color: var(--app-text-muted);
  font-size: 14px;
}
</style>
