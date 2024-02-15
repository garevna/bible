<template>
  <v-dialog
    v-model="dialog"
    width="360"
  >
    <template v-slot:activator="{ on, attrs }">
      <ButtonTooltip
        :icon="icon || '$addKeyword'"
        :text="buttonText || _keywords.lineActionsTooltip"
        :small="small"
        :large="large"
        v-bind="attrs"
        v-on="on"
        :clicked.sync="dialog"
      />
    </template>
    <v-card flat class="homefone pb-4">
      <v-toolbar flat dense class="transparent" height="48">
        <v-spacer />
        <v-icon @click="dialog = false">
          $close
        </v-icon>
      </v-toolbar>

      <v-card flat class="transparent px-5 pb-4">
        <SelectKeyword :selected.sync="keyword" />
      </v-card>

      <v-btn
        outlined
        :disabled="!keyword"
        color="buttons"
        @click="selectKeyword"
        class="d-block mx-auto"
        width="120"
      >
        OK
      </v-btn>
    </v-card>
  </v-dialog>
</template>

<script>

import ButtonTooltip from '@/components/ButtonTooltip.vue'

import { mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  name: 'AddKeywordToList',

  components: {
    ButtonTooltip,
    SelectKeyword: () => import('@/components/selectors/SelectKeyword.vue')
  },

  props: ['lineRef', 'noteId', 'fab', 'icon', 'buttonText', 'large', 'small'],

  data: () => ({
    dialog: false,
    keyword: null,
    search: ''
  }),

  computed: {
    ...mapGetters('language', ['_keywords'])
  },

  watch: {
    lineRef: {
      immediate: true,
      handler (val) {
        this.setCurrentLineId(val)
      }
    }
  },

  methods: {
    ...mapMutations('notes', ['addKeywordToCurrentNote']),
    ...mapMutations('content', ['setCurrentLineId']),
    ...mapActions('content', ['assignKeywordToCurrentVerse']),

    async selectKeyword () {
      this.lineRef && await this.assignKeywordToCurrentVerse(this.keyword)
      this.noteId && this.addKeywordToCurrentNote(this.keyword)
      this.dialog = false
    }
  }
}
</script>
