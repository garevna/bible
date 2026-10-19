<template>
  <span v-if="user.signed" class="d-flex align-center">
    <!--
      the avatar opens the menu of the user: the number, Telegram, the photo, signing out
      (a phone: the calendar and the messages too); there is no profile page
    -->
    <v-menu location="bottom end">
      <template #activator="{ props: menu }">
        <v-tooltip :text="user.displayName">
          <template #activator="{ props: tooltip }">
            <button
              v-bind="{ ...menu, ...tooltip }"
              type="button"
              class="avatar-button mr-2"
              :aria-label="user.displayName"
            >
              <!-- a phone: the number of unread messages; a minister without a mobile number: a mark -->
              <v-badge
                :model-value="unreadHere > 0 || worker.needsPhone"
                :content="unreadHere || undefined"
                :dot="!unreadHere"
                color="warning"
              >
                <v-avatar size="36" color="secondary" class="user-avatar">
                  <!-- Google photos are not shown to pages that send a referrer -->
                  <img
                    v-if="user.avatar && !broken"
                    :src="user.avatar"
                    alt=""
                    referrerpolicy="no-referrer"
                    class="avatar-image"
                    @error="broken = true"
                  />
                  <span v-else class="initials">{{ user.initials }}</span>
                </v-avatar>
              </v-badge>
            </button>
          </template>
        </v-tooltip>
      </template>

      <v-list density="compact" bg-color="homefone" min-width="220">
        <v-list-item :title="user.displayName" :subtitle="user.userName ? (user.email ?? '') : ''" />
        <v-divider />
        <!-- a phone: the calendar and the messages are here, not in the header -->
        <template v-if="compact">
          <v-list-item
            v-if="worker.calendar"
            prepend-icon="mdi-calendar-month-outline"
            :title="calendarText.title"
            v-bind="here('calendar')"
            @click="app.setPage('calendar')"
          />
          <v-list-item
            v-if="worker.canReceive"
            prepend-icon="mdi-message-arrow-right"
            :title="messagesText.title"
            v-bind="here('messages')"
            @click="app.setPage('messages')"
          >
            <template v-if="worker.unread" #append>
              <v-badge :content="worker.unread" color="warning" inline />
            </template>
          </v-list-item>
        </template>
        <v-divider v-if="compact && worker.calendar" />
        <!-- the home groups: here on every screen (the header keeps few buttons) -->
        <v-list-item
          v-if="worker.groups"
          prepend-icon="mdi-home-group"
          :title="pages.groups"
          v-bind="here('groups')"
          @click="app.setPage('groups')"
        />
        <!-- the home group of the user: an administrator or a servant -->
        <v-list-item
          v-if="worker.canReceive"
          prepend-icon="mdi-home-account"
          :title="groupsText.myGroup"
          @click="homeGroupDialog = true"
        />
        <v-list-item
          v-if="worker.canReceive"
          prepend-icon="mdi-cellphone"
          :title="header.myPhone"
          :subtitle="worker.phone ?? ''"
          :base-color="worker.needsPhone ? 'warning' : undefined"
          @click="phoneDialog = true"
        />
        <!-- the service bot: invitations with buttons and the messages in private in Telegram -->
        <template v-if="worker.serviceBot">
          <v-list-item
            v-if="worker.telegramLinked"
            prepend-icon="mdi-send-check-outline"
            :title="header.telegramLinked"
            :subtitle="header.telegramUnlink"
            base-color="secondary"
            @click="worker.unlinkTelegram()"
          />
          <v-list-item
            v-else
            prepend-icon="mdi-send-outline"
            :title="header.telegramLink"
            :subtitle="header.telegramLinkHint"
            @click="linkTelegram"
          />
        </template>
        <v-list-item prepend-icon="mdi-image-edit" :title="header.changePhoto" @click="uploadPhoto" />
        <v-divider />
        <v-list-item prepend-icon="$signOut" :title="header.signOut" @click="user.signOut()" />
      </v-list>
    </v-menu>

    <v-snackbar v-model="failed" color="error" timeout="4000">{{ header.photoFailed }}</v-snackbar>
    <v-snackbar v-model="telegramNote" :color="telegramFailed ? 'error' : 'secondary'" timeout="6000">
      {{ telegramFailed ? header.telegramFailed : header.telegramStart }}
    </v-snackbar>

    <PhoneDialog v-model="phoneDialog" :number="worker.phone" :submit="worker.setMyPhone" />
    <HomeGroupDialog v-model="homeGroupDialog" />

    <!-- ministers: the schedule of ministries -->
    <v-tooltip v-if="!compact && worker.calendar" :text="calendarText.title">
      <template #activator="{ props: tooltip }">
        <v-btn
          v-bind="tooltip"
          icon="mdi-calendar-month-outline"
          :aria-label="calendarText.title"
          :active="app.page === 'calendar'"
          :class="{ 'pe-none': app.page === 'calendar' }"
          @click="app.setPage('calendar')"
        />
      </template>
    </v-tooltip>

    <!-- ministers: the messages, with the number of unread ones -->
    <v-tooltip v-if="!compact && worker.canReceive" :text="messagesText.title">
      <template #activator="{ props: tooltip }">
        <v-btn
          v-bind="tooltip"
          icon
          :aria-label="messagesText.title"
          :active="app.page === 'messages'"
          :class="{ 'pe-none': app.page === 'messages' }"
          @click="app.setPage('messages')"
        >
          <v-badge :model-value="worker.unread > 0" :content="worker.unread" color="warning" floating>
            <v-icon icon="mdi-message-arrow-right" size="26" />
          </v-badge>
        </v-btn>
      </template>
    </v-tooltip>

    <!-- administrators: the dashboard of the roles -->
    <v-tooltip v-if="worker.hasDashboard" :text="admin.openDashboard">
      <template #activator="{ props: tooltip }">
        <v-btn
          v-bind="tooltip"
          icon="mdi-shield-account-outline"
          :aria-label="admin.openDashboard"
          :active="app.page === 'admin'"
          :class="{ 'pe-none': app.page === 'admin' }"
          @click="app.setPage('admin')"
        />
      </template>
    </v-tooltip>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import PhoneDialog from '@/components/PhoneDialog.vue'
import HomeGroupDialog from '@/components/groups/HomeGroupDialog.vue'
import { useAppStore } from '@/stores/app'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import { useWorkerStore } from '@/stores/worker'
import type { Page } from '@/types'
import { pickImage, resizeImage } from '@/utils/image'

/** compact: a phone, where the calendar and the messages are in the menu of the avatar too */
const props = defineProps<{ compact?: boolean }>()

const app = useAppStore()
const user = useUserStore()
const worker = useWorkerStore()
const {
  admin,
  calendar: calendarText,
  groups: groupsText,
  header,
  messages: messagesText,
  pages
} = storeToRefs(useLanguageStore())

/** the number of unread messages on the avatar: a phone, where the messages are in its menu */
const unreadHere = computed(() => (props.compact ? worker.unread : 0))

/** the page the user is on: marked, and not opened again */
const here = (page: Page) => (app.page === page ? { active: true, class: 'pe-none' } : {})

/** the photo could not be loaded: show the initials instead */
const broken = ref(false)
watch(
  () => user.avatar,
  () => (broken.value = false)
)

const failed = ref(false)

/** a minister without a mobile number is asked for it once a session, the mark on the avatar stays */
const phoneDialog = ref(false)
const homeGroupDialog = ref(false)
let asked = false
watch(
  () => worker.needsPhone,
  (needed) => {
    if (!needed || asked) return
    asked = true
    phoneDialog.value = true
  },
  { immediate: true }
)

/**
 * Telegram is linked in the bot: a new tab opens it with a one-time link (opened at once, so the browser
 * does not block it); back in the app, the worker says whether it is linked
 */
const telegramNote = ref(false)
const telegramFailed = ref(false)
async function linkTelegram() {
  const tab = window.open('', '_blank')
  telegramFailed.value = false
  try {
    const url = await worker.telegramLink()
    if (tab) tab.location.href = url
    else window.location.href = url
    window.addEventListener('focus', () => worker.loadRole(), { once: true })
  } catch {
    tab?.close()
    telegramFailed.value = true
  }
  telegramNote.value = true
}

/** a small square photo goes into the profile, so it loads fast and offline too */
async function uploadPhoto() {
  const file = await pickImage()
  if (!file) return
  try {
    await user.updateUserAvatar(await resizeImage(file, { size: 128, square: true }))
  } catch {
    failed.value = true
  }
}
</script>

<style scoped>
.user-avatar {
  border: solid 2px #fffc;
}

.avatar-button {
  border-radius: 50%;
  cursor: pointer;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.initials {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-on-primary);
}
</style>
