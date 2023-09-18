<template>
  <v-dialog
    v-model="dialog"
    width="360"
  >
    <template v-slot:activator="{ on, attrs }">
      <ButtonTooltip
        :icon='buttonIcon'
        :text="buttonTooltipText"
        :small="true"
        v-bind="attrs"
        v-on="on"
        :clicked.sync="dialog"
      />
    </template>
    <v-card flat class="homefone">
      <v-toolbar flat dense class="transparent" height="48">
        <v-spacer />
        <v-icon large @click="dialog = false">
          $close
        </v-icon>
      </v-toolbar>

      <v-card flat class="transparent pa-4" v-if="ready">
        <v-autocomplete
          v-model="keyword"
          :items="records"
          item-text="_id"
          return-object
          prepend-icon="$add"
          append-icon="$submit"
          dense
          outlined
          hide-selected
          label="Ключові слова"
          no-data-text="Немає відповідних даних"
          @click:append="saveKeyword(keyword)"
          :search-input.sync="search"
        />
      </v-card>
    </v-card>
  </v-dialog>
</template>

<script>

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import { menuItems } from '@/configs'

export default {
  name: 'KeywordList',

  components: {
    ButtonTooltip
  },

  props: ['lineRef'],

  data: () => ({
    dialog: false,
    ready: false,
    records: [],
    keyword: null,
    search: '',
    buttonTooltipText: menuItems[1].text,
    buttonIcon: menuItems[1].icon
  }),

  watch: {
    dialog (val) {
      val && this.getData()
    }
  },

  methods: {
    async getData () {
      this.records = (await this.$root.contentController.getKeywords())?.result || []
      console.log('KEYWORDS:\n', this.records)
      this.ready = true
    },

    async saveKeyword () {
      this.ready = false
      console.log('\nTHIS.KEYWORD:\n', this.keyword, '\nSEARCH:', this.search)
      if (!this.keyword && !this.search) return
      const keyword = this.keyword || { _id: this.search, refs: [this.lineRef] }

      const { status, result } = await this.$root.contentController.getKeyword(keyword._id)
      keyword.refs = status !== 200
        ? this.lineRef ? [this.lineRef] : []
        : !result.refs.includes(this.lineRef)
          ? result.refs.concat([this.lineRef])
          : result.refs

      this.records.push(keyword)

      await this.$root.contentController.putKeyword(keyword._id, this.lineRef)
      // await this.$root.contentController.assignKeyword(keyword._id, this.lineRef)
      this.keyword = null
      this.search = ''
      this.$nextTick(() => { this.ready = true })
      this.dialog = false
    }
  }
}
</script>

<style>

.v-toolbar__content {
  padding: 4px !important;
}
</style>
