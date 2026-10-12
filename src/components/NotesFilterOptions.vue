<template>
  <div class="d-flex flex-wrap align-center ga-2 px-4">
    <v-chip v-if="notes.date" closable prepend-icon="$date" @click:close="notes.updateDate(null)">
      {{ notes.dateTo ? `${notes.date} — ${notes.dateTo}` : notes.date }}
    </v-chip>

    <v-chip v-if="notes.topic" closable prepend-icon="$topic" @click:close="notes.updateTopic(null)">
      {{ notes.topic.title }}
    </v-chip>

    <v-chip v-if="notes.keyword" closable @click:close="notes.updateKeyword(null)">
      #{{ notes.keyword }}
    </v-chip>
  </div>
</template>

<script setup lang="ts">
import { useNotesStore } from '@/stores/notes'

const notes = useNotesStore()
</script>
