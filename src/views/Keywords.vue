<template>
  <v-card flat class="transparent mx-auto my-4" max-width="700" :key="lang">
    <table width="100%">
      <tr>
        <td>
          <h4 style="color: #09b">{{ keyword?._id || '' }}</h4>
        </td>
        <td style="text-align: right">
          <v-btn-toggle v-model="toggle" mandatory color="buttons">
            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  text
                  color="buttons"
                  v-bind="attrs"
                  v-on="on"
                >
                  <v-icon color="buttons">
                    $verses
                  </v-icon>
                </v-btn>
              </template>
              <span> {{ _keywords.toggleButtonVersesTooltip }} </span>
            </v-tooltip>

            <span v-if="toggle === 0" class="toggle-button-text">
              {{ _keywords.toggleButtonVerses }}
            </span>

            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  text
                  color="buttons"
                  v-bind="attrs"
                  v-on="on"
                >
                  <v-icon color="buttons">$notes</v-icon>
                </v-btn>
              </template>
              <span> {{ _keywords.toggleButtonNotesTooltip }} </span>
            </v-tooltip>

            <span v-if="toggle === 1"  class="toggle-button-text">
              {{ _keywords.toggleButtonNotes }}
            </span>
          </v-btn-toggle>
        </td>
      </tr>
    </table>

    <v-expansion-panels
      flat
      focusable
      popout
      v-model="panel"
      class="transparent mt-4"
      active-class="expanded-keyword"
      style="height: calc(100vh - 240px); overflow-y: auto"
    >
      <v-expansion-panel
        v-for="keyword in keywordList"
        :key="keyword._id"
      >
        <v-expansion-panel-header>
          <tr>
            <td width="48">
              <v-icon
                @click="deleteItem(keyword)"
                class="delete-icon"
                color="delete"
              >
                $delete
              </v-icon>
            </td>
            <td>
              {{ keyword._id }}
            </td>
          </tr>
        </v-expansion-panel-header>

        <v-expansion-panel-content>
          <v-card flat class="transparent pa-4">
              <div
                v-for="(item, index) in content"
                :key="index"
                style="text-align: justify; border: solid 1px #ddd; border-radius: 4px; padding: 4px 8px;"
              >
                <v-chip small v-if="toggle" class="mb-2">{{ new Date(item._id - 0).toISOString().slice(0, 10) }}</v-chip>
                <p
                  v-html="item.text || item.html"
                  @click="!toggle && $root.$gotoVerse(item._id)"
                />
                <div style="text-align: right" v-if="toggle">
                  <v-chip small v-for="keyword in item.keywords" :key="keyword">#{{ keyword }}</v-chip>
                </div>
              </div>
          </v-card>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- <v-bottom-navigation
      fixed
      v-model="toggle"
      class="transparent mb-12"
      height="48"
    >
      <v-btn>
        <span>{{ _keywords.toggleButtonVerses }}</span>

        <v-icon>$verses</v-icon>
      </v-btn>

      <v-btn>
        <span>{{ _keywords.toggleButtonNotes }}</span>

        <v-icon>$notes</v-icon>
      </v-btn>
    </v-bottom-navigation> -->
  </v-card>
</template>

<script>

import '@/sass/delete.css'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'Keywords',

  data: () => ({
    toggle: 0,
    panel: undefined
  }),

  computed: {
    ...mapState(['lang']),
    ...mapGetters('language', ['_keywords']),
    ...mapState('keywords', ['keywordList']),
    ...mapState('content', ['listOfVerses']),
    ...mapState('notes', ['notes']),

    content () {
      return [this.listOfVerses, this.notes][this.toggle]
    },

    method () {
      return this[['getListOfVerses', 'getNotes'][this.toggle]]
    },

    keyword () {
      return this.panel !== undefined ? this.keywordList[this.panel] : null
    },

    toggleButtonStyle () {
      return this.$root.viewportWidth >= 700
        ? 'margin-right: calc(50% - 350px)'
        : 'margin-right: 0'
    }
  },

  watch: {
    panel (val) {
      if (val === undefined) return

      this.changeContent()
    },

    toggle (val) {
      this.changeContent()
    }
  },

  methods: {
    ...mapActions('keywords', ['getFullList']),
    ...mapActions('content', ['getListOfVerses']),
    ...mapActions('notes', ['getNotes']),

    async changeContent () {
      if (!this.keyword) return

      const args = this.toggle
        ? { keyword: this.keyword._id }
        : this.keyword.refs

      await this.method(args)
    }
  },

  async created () {
    await this.getFullList()
  }
}
</script>

<style>

.v-expansion-panel-header--active {
  background: #09b;
  color: #fff !important;
  font-weight: bold;
}

.v-expansion-panel-header--active button::before {
  color: #fff !important;
}

.v-expansion-panel-header--active .mdi-chevron-down::before {
  color: #fff !important;
}

.content-toggle-buttons {
  text-align: justify;
}

.toggle-button-text {
  padding: 8px;
  color: inherit;
  font-weight: bold;
}

/* .v-btn-toggle > .v-btn.v-btn--active .toggle-button-text {
  padding: 8px;
  color: inherit;
  font-weight: bold;
} */
</style>
