import Vue from 'vue'
import Vuetify from 'vuetify/lib/framework'
import { Ripple } from 'vuetify/lib/directives'

Vue.use(Vuetify)

export default new Vuetify({
  icons: {
    customVariables: ['~/assets/variables.scss'],
    iconfont: 'mdi',
    values: {
      add: 'mdi-plus-box',
      addNote: 'mdi-note-plus',
      addTopic: 'mdi-playlist-plus',
      back: 'mdi-page-previous',
      bible: 'mdi-cross',
      calendar: 'mdi-calendar-cursor',
      cite: 'mdi-comment-quote-outline',
      close: 'mdi-close',
      collapse: 'mdi-chevron-up',
      date: 'mdi-calendar',
      dateSelected: 'mdi-calendar-check',
      delete: 'mdi-delete-forever',
      dotsMenu: 'mdi-dots-vertical',
      down: 'mdi-arrow-down',
      drag: 'mdi-drag',
      edit: 'mdi-pencil-box',
      editNote: 'mdi-note-edit',
      editTopic: 'mdi-playlist-edit',
      expand: 'mdi-chevron-down',
      // expand: 'mdi-dots-horizontal',
      eye: 'mdi-eye',
      hash: 'mdi-pound',
      hide: 'mdi-cog-off-outline',
      keywords: 'mdi-folder-pound-outline',
      keyword: 'mdi-pound',
      main: 'mdi-menu',
      next: 'mdi-chevron-right',
      notes: 'mdi-note-edit-outline',
      note: 'mdi-note',
      prev: 'mdi-chevron-left',
      remove: 'mdi-attachment-remove',
      reset: 'mdi-close',
      return: 'mdi-page-previous',
      save: 'mdi-content-save-outline',
      search: 'mdi-magnify',
      send: 'mdi-send-variant',
      show: 'mdi-cog-outline',
      signIn: 'mdi-login',
      signUp: 'mdi-account-plus',
      signOut: 'mdi-logout',
      submit: 'mdi-button-pointer',
      topics: 'mdi-list-box-outline',
      topic: 'mdi-form-select',
      up: 'mdi-arrow-up',
      verses: 'mdi-book-cross',
      warning: 'mdi-alert'
    }
  },
  directives: {
    Ripple
  },
  theme: {
    themes: {
      light: {
        primary: '#4CAF50',
        secondary: '#09b',
        buttons: '#72BF44',
        greentext: '#20731C',
        deepgreen: '#070',
        homefone: '#FAFAFA',
        warning: '#FA0',
        delete: '#900',
        comment: '#aaa'
      },
      dark: {
        primary: '#4CAF50',
        secondary: '#09b',
        buttons: '#72BF44',
        greentext: '#20731C',
        deepgreen: '#20731C',
        homefone: '#FAFAFA',
        warning: '#FA0',
        delete: '#900'
      }
    }
  }
})
