<template>
  <v-dialog
    v-model="dialog"
    width="360"
  >
    <template v-slot:activator="{ on, attrs }">
      <ButtonTooltip
        :icon='icon || buttonIcon'
        :text="buttonText || buttonTooltipText"
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

      <v-card flat class="transparent px-5 pb-4" :key="ready">
        <v-autocomplete
          v-model="keyword"
          :items="records"
          item-text="_id"
          return-object
          dense
          outlined
          autofocus
          hide-selected
          hide-details
          label="Ключові слова"
          :no-data-text="noDataText"
          :search-input.sync="search"
        />
      </v-card>
      <v-btn
        outlined
        :disabled="!keyword"
        color="buttons"
        @click="saveKeyword"
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
import { menuItems } from '@/configs'

const { getCommonText } = require('@/configs/language').default

export default {
  name: 'KeywordList',

  components: {
    ButtonTooltip
  },

  props: ['lineRef', 'selectedKeyword', 'icon', 'buttonText', 'large', 'small'],

  data: () => ({
    noDataText: getCommonText('ua', 'noData'),
    dialog: false,
    ready: 0,
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
      this.records = await this.$root.contentController.getKeywords()
      ++this.ready
    },

    async saveKeyword () {
      if (!this.keyword && !this.search) return

      const keyword = this.keyword || { _id: this.search }

      const result = await this.$root.contentController.putKeyword(keyword._id, this.lineRef || null)

      this.$emit('update:selectedKeyword', result._id)

      this.records.push(result)

      Object.assign(this, { dialog: false, keyword: null, search: '', ready: ++this.ready })
    }
  }
}
</script>
