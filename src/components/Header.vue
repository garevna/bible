<template>
  <v-app-bar
    app
    flat
    color="primary"
    dark
    class="bottom-border mx-0 px-0"
    :key="lang"
  >
    <v-card
      class="app-bar-content d-flex align-center justify-space-between transparent"
      flat
      tile
      width="100%"
      height="48"
    >
      <div class="ml-5">
        <v-img
          :src="require('@/assets/logo.png')"
          class="logo my-3"
          contain
          width="40"
          height="48"
        />

        <span v-if="!short" class="kcc-title">
          {{ _header.chirchTitle }}
        </span>
        <span v-else>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <span
                dark
                class="mr-4"
                v-bind="attrs"
                v-on="on"
              >
                {{ _header.chirchTitleShort }}
              </span>
            </template>
            <span>{{ _header.chirchTitle }}</span>
          </v-tooltip>
        </span>
      </div>

      <v-spacer />

      <div class="mr-5">
        <User :signed.sync="signed" />

        <span v-if="!signed">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-icon
                dark
                class="mr-4"
                v-bind="attrs"
                v-on="on"
                @click="$emit('update:signIn', true)"
              >
                $signIn
              </v-icon>
            </template>
            <span>{{ _common.signIn }}</span>
          </v-tooltip>

          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-icon
                dark
                v-bind="attrs"
                v-on="on"
                @click="$emit('update:signUp', true)"
              >
                $signUp
              </v-icon>
            </template>
            <span>{{ _common.signUp }}</span>
          </v-tooltip>
        </span>
      </div>

      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <!-- <v-avatar size="24" class="mx-2 rounded-0" v-bind="attrs" v-on="on"> -->
            <img
              v-bind="attrs"
              v-on="on"
              :src="langIcon"
              height="16"
              @click="showLangMenu($event)"
            />
          <!-- </v-avatar> -->
        </template>
        <span>{{ _common.lang }}</span>
      </v-tooltip>

      <DropdownMenu
        v-if="langMenu"
        :event="event"
        :showMenu.sync="langMenu"
        :menuItems="langMenuItems"
        :selected.sync="language"
      />

      <!-- <v-avatar size="16" class="ml-2 rounded-0"> -->
        <!-- <img :src="require('@/assets/uk-flag.png')" height="16" /> -->
      <!-- </v-avatar> -->

      <!-- <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-icon
            class="ml-2 rounded-0"
            v-bind="attrs"
            v-on="on"
            @click="showTranslationMenu($event)"
          >
            mdi-book-cross
          </v-icon> -->
          <!-- <v-avatar size="16" class="ml-2 rounded-0" v-bind="attrs" v-on="on">
            <v-img :src="require('@/assets/ukrainian.svg')" />
          </v-avatar> -->
        <!-- </template>
        <span>{{ _header[translation] }}</span>
      </v-tooltip> -->

      <v-icon
        class="ml-2 rounded-0"
        @click="showTranslationMenu($event)"
      >
        mdi-book-cross
      </v-icon>
    </v-card>

    <DropdownMenu
      v-if="translationMenu"
      :event="event"
      :showMenu.sync="translationMenu"
      :menuItems="translationMenuItems"
      :selected.sync="translated"
    />

    <v-slide-y-transition>
      <div>
        <h4 dark class="primary view-title">
          {{ title }}
        </h4>
      </div>
    </v-slide-y-transition>
  </v-app-bar>
</template>

<script>

import User from '@/components/user/User.vue'
import DropdownMenu from '@/components/DropdownMenu.vue'

import { langMenuItems, translationMenuItems } from '@/configs'

import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  name: 'Header',

  components: {
    User,
    DropdownMenu
  },

  props: ['signIn', 'signUp'],

  data: () => ({
    event: null,
    langMenu: false,
    translationMenu: false,
    translationMenuItems: []
  }),

  computed: {
    ...mapGetters('language', ['_common', '_header', '_pages']),
    ...mapState(['viewportWidth']),
    ...mapGetters(['langIcon']),
    ...mapState(['page', 'footerMenu']),
    ...mapState('content', ['covenantIndex', 'bookIndex']),
    ...mapGetters('content', ['books', 'bookTitle']),
    ...mapState('user', ['lang', 'translation']),
    ...mapGetters('user', ['signed']),

    short () {
      return this.viewportWidth < 600
    },

    title () {
      return this._pages[this.page || 'bible']
    },

    language: {
      get () {
        return this.lang
      },
      set (val) {
        this.switchLanguage(val)
        console.log(this._common)
      }
    },

    translated: {
      get () {
        return this.translation
      },
      set (val) {
        this.switchTranslation(val)
      }
    },

    langMenuItems () {
      return langMenuItems.map(item => ({ value: item.value, text: item.text[this.lang], icon: item.icon }))
    }
  },

  watch: {
    lang (val) {
      console.log('HEADER LANG: ', val)
      Object.assign(this, {
        translationMenuItems: translationMenuItems.map(item => ({ value: item.value, text: item.text[this.lang] }))
      })
    }
  },

  methods: {
    ...mapMutations(['switchLanguage', 'setTranslation']),
    ...mapActions('content', ['switchTranslation']),

    executeAction (actionName) {
      typeof this[actionName] === 'function' && this[actionName]()
    },

    showLangMenu (event) {
      this.event = { x: event.x - 32, y: event.y - 8 }
      this.langMenu = true
    },

    showTranslationMenu (event) {
      this.event = { x: event.x - 16, y: event.y + 16 }
      this.translationMenu = true
    }
  },

  mounted () {
    Object.assign(this, {
      translationMenuItems: translationMenuItems.map(item => ({ value: item.value, text: item.text[this.lang || 'ua'] }))
    })
  }
}
</script>

<style scoped>

.app-bar-content {
  z-index: 50;
}

.logo, .kcc-title {
  display: inline-block;
  vertical-align: middle;
  margin-right: 12px;
}
/*
.kcc-title::after {
  content: 'Харківська християнська церква';
  font-weight: bold;
}
*/
/*
.translation-text::after {
  content: 'Переклад І. Огієнка'
}
*/
.view-title-wrapper {}

.view-title {
  position: fixed;
  z-index: 45;
  left: 50%;
  transform: translate(-50%, 0);
  top: 40px;
  border-radius: 8px;
  max-width: 360px;
  min-width: 160px;
  padding: 16px 16px 8px;
  text-align: center;
}
/*
@media screen and (max-width: 600px) {
  .kcc-title::after {
    content: 'ХXЦ';
  }
  .translation-text::after {
    content: ''
  }
}
*/
.bottom-border {
  border-bottom: solid 1px #fff8 !important;
}

</style>
