<template>
  <v-app-bar flat color="primary" class="bottom-border">
    <div class="d-flex align-center ml-4">
      <img :src="logo" alt="" class="logo mr-3" width="40" height="48" />

      <span v-if="!short" class="font-weight-bold">{{ header.chirchTitle }}</span>
      <v-tooltip v-else :text="header.chirchTitle">
        <template #activator="{ props }">
          <span v-bind="props">{{ header.chirchTitleShort }}</span>
        </template>
      </v-tooltip>
    </div>

    <v-spacer />

    <v-tooltip v-if="!user.signed" :text="pages.search">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="$search"
          :aria-label="pages.search"
          size="small"
          @click="app.setPage(app.page === 'search' ? 'bible' : 'search')"
        />
      </template>
    </v-tooltip>

    <User :compact="compact" />

    <!-- a phone: the messages, the dashboard, the language, the translation and signing out in one menu -->
    <v-menu v-if="compact" location="bottom end">
      <template #activator="{ props }">
        <v-btn v-bind="props" icon size="small" class="mr-2" :aria-label="header.menu">
          <v-badge :model-value="worker.unread > 0" :content="worker.unread" color="warning" floating>
            <v-icon icon="mdi-menu" />
          </v-badge>
        </v-btn>
      </template>

      <v-list density="compact" bg-color="homefone" min-width="270" class="header-menu">
        <v-list-item
          v-if="worker.canReceive"
          prepend-icon="mdi-email-outline"
          :title="messagesText.title"
          @click="app.setPage('messages')"
        >
          <template v-if="worker.unread" #append>
            <v-badge :content="worker.unread" color="warning" inline />
          </template>
        </v-list-item>
        <v-list-item
          v-if="worker.isAdmin"
          prepend-icon="mdi-shield-account-outline"
          :title="admin.openDashboard"
          @click="app.setPage('admin')"
        />
        <v-divider v-if="worker.canReceive || worker.isAdmin" />

        <v-list-subheader>{{ common.langMenuTooltip }}</v-list-subheader>
        <v-list-item
          v-for="item of langMenuItems"
          :key="item.value"
          :active="item.value === user.lang"
          @click="user.updateUserLang(item.value)"
        >
          <template #prepend>
            <img :src="item.icon" alt="" width="24" class="mr-3" />
          </template>
          <v-list-item-title class="text-wrap">{{ item.text[user.lang] }}</v-list-item-title>
        </v-list-item>

        <v-list-subheader>{{ header.translationMenu }}</v-list-subheader>
        <v-list-item
          v-for="item of translationMenuItems"
          :key="item.value"
          :active="item.value === user.translation"
          @click="content.switchTranslation(item.value)"
        >
          <template #prepend>
            <v-icon
              :icon="item.rights ? 'mdi-file-document-alert-outline' : 'mdi-file-document-check-outline'"
              :color="item.rights ? 'warning' : 'primary'"
              class="mr-3"
            />
          </template>
          <v-list-item-title class="text-wrap">{{ item.text[user.lang] }}</v-list-item-title>
        </v-list-item>

        <v-divider />
        <v-list-item prepend-icon="$signOut" :title="header.signOut" @click="user.signOut()" />
      </v-list>
    </v-menu>

    <template v-if="!user.signed">
      <v-tooltip :text="header.signIn">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="$signIn"
            size="small"
            :aria-label="header.signIn"
            @click="signIn = true"
          />
        </template>
      </v-tooltip>

      <!-- <v-tooltip :text="header.signUp">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="$signUp"
            size="small"
            :aria-label="header.signUp"
            @click="signUp = true"
          />
        </template>
      </v-tooltip> -->
    </template>

    <v-menu v-if="!compact">
      <template #activator="{ props: menu }">
        <v-tooltip :text="common.langMenuTooltip">
          <template #activator="{ props: tooltip }">
            <v-btn
              v-bind="{ ...menu, ...tooltip }"
              icon
              size="default"
              class="ml-2"
              :aria-label="common.langMenuTooltip"
            >
              <img :src="langIcon" alt="lang" width="28" height="24" style="border-radius: 50%" />
            </v-btn>
          </template>
        </v-tooltip>
      </template>

      <v-list density="compact" bg-color="homefone">
        <v-list-item
          v-for="item of langMenuItems"
          :key="item.value"
          :active="item.value === user.lang"
          @click="user.updateUserLang(item.value)"
        >
          <template #prepend>
            <img :src="item.icon" alt="" width="28" class="mr-3" />
          </template>
          <v-list-item-title>{{ item.text[user.lang] }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

    <v-menu v-if="!compact">
      <template #activator="{ props }">
        <!-- <ButtonTooltip
          v-bind="props"
          icon="$bibleVersion"
          size="medium"
          class="text-white ml-3 mr-5"
          :aria-label="header.translationMenu"
          :text="header.translationMenu"
        /> -->
        <v-icon
          v-bind="props"
          icon="mdi-book-cross"
          size="large"
          class="mr-5 ml-3 text-white"
          :aria-label="header.translationMenu"
          :tooltip="header.translationMenu"
        />
      </template>

      <v-list density="compact" bg-color="homefone">
        <v-list-item
          v-for="item of translationMenuItems"
          :key="item.value"
          :active="item.value === user.translation"
          @click="content.switchTranslation(item.value)"
        >
          <!-- free to use, or a warning: permission is needed -->
          <template #prepend>
            <v-tooltip
              :text="
                item.rights ? item.rights[user.lang] : (item.notice?.[user.lang] ?? header.translationFree)
              "
              location="start"
              max-width="360"
            >
              <template #activator="{ props: tooltip }">
                <v-icon
                  v-bind="tooltip"
                  :icon="item.rights ? 'mdi-file-document-alert-outline' : 'mdi-file-document-check-outline'"
                  :color="item.rights ? 'warning' : 'primary'"
                  :class="item.rights ? 'translation-rights--warning' : 'translation-rights--free'"
                  class="mr-3"
                />
              </template>
            </v-tooltip>
          </template>
          <v-list-item-title>{{ item.text[user.lang] }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

    <v-progress-linear :active="app.progress" indeterminate absolute location="bottom" color="warning" />

    <h4 class="view-title bg-primary">{{ title }}</h4>
  </v-app-bar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDisplay } from 'vuetify'

import langFallbackIcon from '@/assets/lang.svg'
import logo from '@/assets/logo.png'
import User from '@/components/user/User.vue'
// import ButtonTooltip from '@/components/ButtonTooltip.vue'
import { langMenuItems, translationMenuItems } from '@/configs'
import { useAppStore } from '@/stores/app'
import { useContentStore } from '@/stores/content'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import { useWorkerStore } from '@/stores/worker'

const signIn = defineModel<boolean>('signIn', { default: false })
// const signUp = defineModel<boolean>('signUp', { default: false })

const app = useAppStore()
const content = useContentStore()
const user = useUserStore()
const worker = useWorkerStore()
const { admin, common, header, messages: messagesText, pages } = storeToRefs(useLanguageStore())

/** a phone with a signed in user: one menu instead of a row of buttons */
const { smAndDown } = useDisplay()
const compact = computed(() => user.signed && smAndDown.value)

const short = computed(() => app.viewportWidth < 600)

const title = computed(() => {
  const page = (app.page ?? 'bible') as keyof typeof pages.value
  return pages.value[page] ?? ''
})

const langIcon = computed(
  () => langMenuItems.find((item) => item.value === user.lang)?.icon ?? langFallbackIcon
)
</script>

<style scoped>
.logo {
  object-fit: contain;
}

.view-title {
  position: fixed;
  z-index: 45;
  left: 50%;
  transform: translate(-50%, 0);
  top: 40px;
  border-radius: var(--app-radius);
  max-width: 360px;
  min-width: 160px;
  padding: 16px 16px 8px;
  text-align: center;
}

/* narrow screens: the header is full of buttons, so the title hangs below it */
@media (max-width: 700px) {
  .view-title {
    top: 64px;
    min-width: 120px;
    padding: 4px 16px 6px;
    border-radius: 0 0 8px 8px;
    font-size: 14px;
  }
}

.bottom-border {
  border-bottom: solid 1px var(--app-surface) !important;
}
</style>
