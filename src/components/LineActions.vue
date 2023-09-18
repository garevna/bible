<template>
  <v-card flat class="transparent">
      <LineDetails :lineRef="lineRef" />
      <KeywordList :lineRef="lineRef" />
      <TopicList :lineRef="lineRef" />
      <AddNoteToLine :lineRef="lineRef" />
  </v-card>
</template>

<script>
import KeywordList from '@/components/KeywordList.vue'
import TopicList from '@/components/TopicList.vue'
import AddNoteToLine from '@/components/AddNoteToLine.vue'
import LineDetails from '@/components/LineDetails.vue'

export default {
  name: 'LineActions',

  components: {
    LineDetails,
    KeywordList,
    TopicList,
    AddNoteToLine
  },

  props: ['lineRef']
}
</script>
