<template>
  <span>
    <v-tooltip top>
      <template v-slot:activator="{ on, attrs }">
        <v-icon
          :color="color || 'buttons'"
          v-bind="attrs"
          v-on="on"
          class="mx-2"
          @click="dialog = true"
        >
          $keyword
        </v-icon>
      </template>
      <span> {{ _selector.keywordPrompt }} </span>
    </v-tooltip>

    <v-dialog
      v-model="dialog"
      min-width="320"
      max-width="480"
      style="background-color: #FAFAFA"
    >
      <table width="100%" class="mb-8">
        <tr>
          <td>
            <strong class="ml-4">{{ _keywords.select }}</strong>
          </td>
          <td width="48" class="text-right">
            <v-btn icon @click="dialog = false">
              <v-icon>$close</v-icon>
            </v-btn>
          </td>
        </tr>
      </table>

      <div class="text-center mx-auto px-4">
        <v-autocomplete
          v-model="selected"
          :items="searchResult"
          item-text="_id"
          dense
          outlined
          clearable
          :prepend-inner-icon="prependIcon"
          hide-details
          :label="_selector.textSearchPrompt"
          :no-data-text="_selector.noData"
          :search-input.sync="search"
          @click:prepend-inner="createKeyword"
          width="80%"
        />
        <v-btn
          class="mx-auto mt-8 mb-4"
          text
          outlined
          color="buttons"
          width="120"
          @click="dialog = false"
        >
          {{ _selector.okButton }}
        </v-btn>
      </div>
    </v-dialog>
  </span>
</template>

<script>

import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

const addIcon = '$add'

export default {
  name: 'SelectKeywordDialog',

  props: ['selectedKeyword', 'dark', 'color'],

  data: () => ({
    dialog: false,
    search: ''
  }),

  computed: {
    ...mapGetters('language', ['_selector', '_keywords']),
    ...mapState('keywords', ['keyword', 'searchResult']),

    prependIcon () {
      return this.search && this.search.length && !this.searchResult.length
        ? addIcon
        : '$search'
    },

    selected: {
      get () {
        return this.selectedKeyword
      },
      set (val) {
        this.$emit('update:selectedKeyword', val)
      }
    }
  },

  watch: {
    search (val) {
      val && val !== this.selected && this.searchKeywords(val)
    }
  },

  methods: {
    ...mapActions('keywords', ['searchKeywords', 'putKeyword']),
    ...mapMutations('keywords', ['updateSearchResult']),

    async createKeyword () {
      if (this.prependIcon !== addIcon) return
      await this.putKeyword({
        _id: this.search,
        refs: []
      })
      this.updateSearchResult([this.search])
    }
  }
}
</script>

<style>
.v-text-field--outlined.v-input--dense .v-label--active {
  left: -28px !important;
}
</style>
