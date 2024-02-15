<template>
  <fieldset class="field-set">
    <legend>{{ _keywords.listHeader }}</legend>

    <table class="mb-4">
      <tr
        v-for="keyword in keywords"
        :key="keyword"
      >
        <td width="48">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-icon
                color="delete"
                class="delete-icon"
                v-bind="attrs"
                v-on="on"
                @click="remove(keyword)"
              >
                $remove
              </v-icon>
            </template>
            <span>{{ _keywords.removeFromListTooltip }}</span>
          </v-tooltip>
        </td>
        <td> {{ keyword }} </td>
      </tr>
    </table>

    <AddKeywordToList
      :lineRef="lineRef"
      :noteId="noteId"
      icon="mdi-pound-box"
      :large="true"
      :buttonText="_keywords.addToListTooltip"
    />
  </fieldset>
</template>

<script>

import '@/sass/fieldset.css'
import '@/sass/delete.css'

import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  name: 'EditKeywordList',

  props: ['lineRef', 'noteId'],

  components: {
    AddKeywordToList: () => import('@/components/keywords/AddKeywordToList.vue')
  },

  data: () => ({
    keyword: null
  }),

  computed: {
    ...mapGetters('language', ['_keywords']),
    ...mapState('content', ['lineKeywords']),
    ...mapState('notes', ['currentNote']),

    keywords () {
      return this.lineRef
        ? this.lineKeywords
        : this.noteId
          ? this.currentNote.keywords
          : []
    }
  },

  watch: {
    lineRef (val) {
      val && this.getLineKeywords(val)
    }
  },

  methods: {
    ...mapActions('content', ['getLineKeywords', 'removeKeywordFromVerse']),
    ...mapMutations('notes', ['removeKeywordFromCurrentNote']),

    async remove (keyword) {
      this.lineRef && await this.removeKeywordFromVerse({ keyword, lineRef: this.lineRef })
      this.noteId && this.removeKeywordFromCurrentNote(keyword)
    }
  }
}
</script>
