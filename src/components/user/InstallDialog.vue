<template>
  <AppDialog
    v-model="open"
    :title="phone ? text.installTitle : text.installTitleDesktop"
    :icon="phone ? 'mdi-cellphone-arrow-down' : 'mdi-monitor-arrow-down'"
    max-width="520"
  >
    <p class="lead">{{ phone ? text.installLead : text.installLeadDesktop }}</p>

    <!-- Chrome or Edge (a phone or a computer): the browser installs by one button -->
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
    <ol v-else-if="place === 'iphone'" class="steps">
      <li>
        {{ text.installAppleShare }}
        <v-icon icon="mdi-export-variant" size="small" class="ml-1" />
      </li>
      <li>{{ text.installAppleHome }} <v-icon icon="mdi-plus-box-outline" size="small" class="ml-1" /></li>
      <li>{{ text.installAppleAdd }}</li>
    </ol>

    <!-- a Mac with Safari: the menu "File" -->
    <ol v-else-if="place === 'safari-mac'" class="steps">
      <li>{{ text.installMacFile }}</li>
    </ol>

    <!-- Firefox on a computer does not install: another browser does -->
    <v-alert v-else-if="place === 'firefox-desktop'" type="info" variant="tonal" class="my-3">
      {{ text.installFirefox }}
    </v-alert>

    <!-- another phone or computer: through the menu of the browser -->
    <ol v-else class="steps">
      <li>
        {{ phone ? text.installMenu : text.installMenuDesktop }}
        <v-icon icon="mdi-dots-vertical" size="small" class="ml-1" />
      </li>
      <li>{{ phone ? text.installMenuItem : text.installMenuItemDesktop }}</li>
    </ol>

    <p class="muted">{{ phone ? text.installSignedIn : text.installAfterDesktop }}</p>

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
import { install, installPlace, installPrompt, onPhone } from '@/utils/install'

/**
 * How to install the app: on the home screen of a phone, or on a computer (its own window, the Start
 * menu, the taskbar): one button in Chrome and Edge, simple steps elsewhere
 */
const open = defineModel<boolean>({ default: false })

const { header: text, common } = storeToRefs(useLanguageStore())
const place = installPlace()
const phone = onPhone()

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
