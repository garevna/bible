<template>
  <article class="post-card">
    <header class="d-flex flex-wrap align-center ga-2">
      <v-icon :icon="item.kind === 'topic' ? '$topic' : '$note'" size="small" />
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
        <AttachmentView :attachment="{ kind: item.kind, post: item.post }" class="mb-2" />
        <!-- the administrator of the channel: a picture for the post -->
        <div
          v-if="mode === 'queue' && item.status === 'approved'"
          class="d-flex flex-wrap align-center ga-2 mb-2"
        >
          <img v-if="image" :src="image" alt="" class="picture" />
          <v-btn
            variant="tonal"
            color="buttons"
            size="small"
            class="text-none"
            prepend-icon="mdi-image-plus"
            @click="addImage"
          >
            {{ image ? text.changeImage : text.addImage }}
          </v-btn>
          <v-btn v-if="image" variant="text" size="small" class="text-none" @click="image = null">{{
            text.noImage
          }}</v-btn>
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
          @click="emit('publish', item, image)"
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
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import ConfirmButton from '@/components/ConfirmButton.vue'
import AttachmentView from '@/components/messages/AttachmentView.vue'
import { useLanguageStore } from '@/stores/language'
import type { Submission } from '@/stores/posts'
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
  publish: [item: Submission, image: string | null]
  remove: [item: Submission]
}>()

const user = useUserStore()
const { posts: text } = storeToRefs(useLanguageStore())

const opened = ref(props.mode !== 'mine')
const image = ref<string | null>(null)

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
  if (file) image.value = await resizeImage(file, { size: 1280 })
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

.picture {
  max-height: 120px;
  border-radius: var(--app-radius);
}
</style>
