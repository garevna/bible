<template>
  <span v-if="user.signed" class="d-flex align-center">
    <!-- the avatar opens a small menu: the photo is changed here, there is no profile page -->
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
              <!-- a minister without a mobile number gets a mark on the avatar -->
              <v-badge :model-value="worker.needsPhone" color="warning" dot>
                <v-avatar size="32" color="secondary" class="user-avatar">
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
        <v-list-item
          v-if="worker.canReceive"
          prepend-icon="mdi-cellphone"
          :title="header.myPhone"
          :subtitle="worker.phone ?? ''"
          :base-color="worker.needsPhone ? 'warning' : undefined"
          @click="phoneDialog = true"
        />
        <v-list-item prepend-icon="mdi-camera-outline" :title="header.uploadPhoto" @click="uploadPhoto" />
        <v-list-item
          v-if="user.avatar"
          prepend-icon="mdi-account-circle-outline"
          :title="header.removePhoto"
          @click="user.updateUserAvatar('')"
        />
      </v-list>
    </v-menu>

    <v-snackbar v-model="failed" color="error" timeout="4000">{{ header.photoFailed }}</v-snackbar>

    <PhoneDialog v-model="phoneDialog" :number="worker.phone" :submit="worker.setMyPhone" />

    <!-- ministers: the schedule of ministries -->
    <v-tooltip v-if="!compact && worker.canReceive" :text="calendarText.title">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-calendar-month-outline"
          size="small"
          :aria-label="calendarText.title"
          :active="app.page === 'calendar'"
          :class="{ 'pe-none': app.page === 'calendar' }"
          @click="app.setPage('calendar')"
        />
      </template>
    </v-tooltip>

    <!-- ministers: the messages, with the number of unread ones -->
    <v-tooltip v-if="!compact && worker.canReceive" :text="messagesText.title">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon
          size="small"
          :aria-label="messagesText.title"
          :active="app.page === 'messages'"
          :class="{ 'pe-none': app.page === 'messages' }"
          @click="app.setPage('messages')"
        >
          <v-badge :model-value="worker.unread > 0" :content="worker.unread" color="warning" floating>
            <v-icon icon="mdi-email-outline" />
          </v-badge>
        </v-btn>
      </template>
    </v-tooltip>

    <!-- administrators: the dashboard of the roles -->
    <v-tooltip v-if="!compact && worker.isAdmin" :text="admin.openDashboard">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-shield-account-outline"
          size="small"
          :aria-label="admin.openDashboard"
          :active="app.page === 'admin'"
          :class="{ 'pe-none': app.page === 'admin' }"
          @click="app.setPage('admin')"
        />
      </template>
    </v-tooltip>

    <v-tooltip v-if="!compact" :text="header.signOut">
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

import PhoneDialog from '@/components/PhoneDialog.vue'
import { useAppStore } from '@/stores/app'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import { useWorkerStore } from '@/stores/worker'
import { pickImage, resizeImage } from '@/utils/image'

/** compact: on a phone the messages, the dashboard and signing out are in the menu of the header */
defineProps<{ compact?: boolean }>()

const app = useAppStore()
const user = useUserStore()
const worker = useWorkerStore()
const { admin, calendar: calendarText, header, messages: messagesText } = storeToRefs(useLanguageStore())

/** the photo could not be loaded: show the initials instead */
const broken = ref(false)
watch(
  () => user.avatar,
  () => (broken.value = false)
)

const failed = ref(false)

/** a minister without a mobile number is asked for it once a session, the mark on the avatar stays */
const phoneDialog = ref(false)
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
