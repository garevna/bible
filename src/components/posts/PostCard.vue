<template>
  <article class="post-card">
    <header class="d-flex flex-wrap align-center ga-2">
      <v-icon
        :icon="item.kind === 'image' ? 'mdi-image-outline' : item.kind === 'topic' ? '$topic' : '$note'"
        size="small"
      />
      <span class="title flex-grow-1">{{ item.title || '…' }}</span>
      <v-chip size="small" variant="tonal" :color="stateColor">{{ stateText }}</v-chip>
    </header>
    <p class="facts">
      {{ format(text.byAuthor, { name: item.authorName }) }} · {{ when }}
      <template v-if="item.approverName">
        · {{ format(text.approver, { name: item.approverName }) }}</template
      >
    </p>
    <p v-if="item.status === 'returned' && item.comment" class="comment">«{{ item.comment }}»</p>

    <v-expand-transition>
      <div v-if="opened">
        <!-- a picture asked by a task, or the picture of a post -->
        <StoredImage v-if="item.post.image" :src="item.post.image" class="mb-2" />
        <AttachmentView
          v-if="item.kind !== 'image'"
          :attachment="{ kind: item.kind, post: item.post }"
          class="mb-2"
        />
        <p v-if="badPicture" class="text-error mb-2">{{ text.badPicture }}</p>
        <!-- the administrator of the channel: a picture for the post, of the device or an approved one -->
        <div
          v-if="mode === 'queue' && item.status === 'approved' && item.kind !== 'image'"
          class="d-flex flex-wrap align-center ga-2 mb-2"
        >
          <StoredImage v-if="chosenPicture" :src="chosenPicture.post.image" class="picture" />
          <img v-else-if="image" :src="image" alt="" class="picture" />
          <v-btn
            v-if="posts.pictures.length"
            variant="tonal"
            color="buttons"
            size="small"
            class="text-none"
            prepend-icon="mdi-image-multiple-outline"
            @click="gallery = true"
          >
            {{ text.choosePicture }}
          </v-btn>
          <v-btn
            variant="tonal"
            color="buttons"
            size="small"
            class="text-none"
            prepend-icon="mdi-image-plus"
            @click="addImage"
          >
            {{ text.addImage }}
          </v-btn>
          <v-btn
            v-if="image || chosenPicture"
            variant="text"
            size="small"
            class="text-none"
            @click="clearPicture"
          >
            {{ text.noImage }}
          </v-btn>
        </div>
      </div>
    </v-expand-transition>

    <footer class="d-flex flex-wrap align-center ga-2">
      <v-btn
        variant="text"
        size="small"
        class="text-none"
        :prepend-icon="opened ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        @click="opened = !opened"
      >
        {{ opened ? text.hide : text.show }}
      </v-btn>
      <v-spacer />
      <!-- the approver -->
      <template v-if="mode === 'approve'">
        <v-btn
          variant="tonal"
          color="delete"
          size="small"
          class="text-none"
          :disabled="busy"
          @click="emit('return', item)"
        >
          {{ text.return }}
        </v-btn>
        <v-btn
          variant="flat"
          color="primary"
          size="small"
          class="text-none"
          :loading="busy"
          @click="emit('approve', item)"
        >
          {{ text.approve }}
        </v-btn>
      </template>
      <!-- the administrator of the channel: no publishing before the approval -->
      <template v-else-if="mode === 'queue' && item.status !== 'published'">
        <v-btn
          variant="tonal"
          color="delete"
          size="small"
          class="text-none"
          :disabled="busy"
          @click="emit('return', item)"
        >
          {{ text.return }}
        </v-btn>
        <v-btn
          variant="flat"
          color="primary"
          size="small"
          class="text-none"
          prepend-icon="mdi-send"
          :disabled="item.status !== 'approved'"
          :loading="busy"
          @click="emit('publish', item, chosenPicture ? null : image, chosenPicture?.id ?? null)"
        >
          {{ text.publishNow }}
        </v-btn>
      </template>
      <ConfirmButton
        v-else-if="mode === 'mine' && item.status !== 'published'"
        icon="$unlink"
        :text="text.remove"
        @confirm="emit('remove', item)"
      />
    </footer>

    <!-- the approved pictures asked by the tasks: one of them goes with the post -->
    <AppDialog
      v-model="gallery"
      :title="text.choosePicture"
      icon="mdi-image-multiple-outline"
      max-width="640"
    >
      <div class="gallery">
        <button
          v-for="picture of posts.pictures"
          :key="picture.id"
          type="button"
          class="gallery__item"
          @click="choose(picture)"
        >
          <StoredImage :src="picture.post.image" />
          <span>{{ picture.title }} · {{ picture.authorName }}</span>
        </button>
      </div>
    </AppDialog>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ConfirmButton from '@/components/ConfirmButton.vue'
import StoredImage from '@/components/posts/StoredImage.vue'
import AttachmentView from '@/components/messages/AttachmentView.vue'
import { useLanguageStore } from '@/stores/language'
import { usePostsStore, type Submission } from '@/stores/posts'
import { useUserStore } from '@/stores/user'
import { formatDateTime, localeOf } from '@/utils/dates'
import { format } from '@/utils/format'
import { pickImage, resizeImage } from '@/utils/image'

/**
 * A post for the channel: its author, its approver and its state; its texts open below.
 * mine: the author removes it; approve: approved or returned; queue: published with a picture.
 */
const props = defineProps<{ item: Submission; mode: 'mine' | 'approve' | 'queue'; busy?: boolean }>()
const emit = defineEmits<{
  approve: [item: Submission]
  return: [item: Submission]
  publish: [item: Submission, image: string | null, imageFrom: string | null]
  remove: [item: Submission]
}>()

const user = useUserStore()
const { posts: text } = storeToRefs(useLanguageStore())

const opened = ref(props.mode !== 'mine')
const image = ref<string | null>(null)
const posts = usePostsStore()
/** an approved picture chosen for the post */
const chosenPicture = ref<Submission | null>(null)
const gallery = ref(false)
const badPicture = ref(false)
function choose(picture: Submission) {
  chosenPicture.value = picture
  image.value = null
  gallery.value = false
}
function clearPicture() {
  chosenPicture.value = null
  image.value = null
}

const when = computed(() =>
  formatDateTime(props.item.publishedAt ?? props.item.createdAt, localeOf(user.lang))
)

const stateText = computed(
  () =>
    ({
      pending: text.value.statePending,
      approved: props.item.approverUid ? text.value.stateApproved : text.value.stateReady,
      returned: text.value.stateReturned,
      published: text.value.statePublished
    })[props.item.status]
)
const stateColor = computed(
  () =>
    ({ pending: 'calendar-orange', approved: 'primary', returned: 'delete', published: 'secondary' })[
      props.item.status
    ]
)

/** a picture of the post: made small enough for the channel */
async function addImage() {
  const file = await pickImage()
  if (!file) return
  badPicture.value = false
  try {
    image.value = await resizeImage(file, { size: 1280 })
    chosenPicture.value = null
  } catch {
    // not a picture the browser reads: said plainly
    badPicture.value = true
  }
}
</script>

<style scoped>
.post-card {
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface);
  padding: 10px 14px;
  margin-bottom: 10px;
}

.title {
  font-weight: 600;
}

.facts {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 2px 0 6px;
}

.comment {
  font-style: italic;
  margin-bottom: 6px;
}

.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}

.gallery__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  font-size: 13px;
  text-align: left;
}

.gallery__item:hover {
  border-color: rgb(var(--v-theme-secondary));
}

.picture {
  max-height: 120px;
  border-radius: var(--app-radius);
}
</style>
