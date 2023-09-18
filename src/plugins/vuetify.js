import Vue from 'vue'
import Vuetify from 'vuetify/lib/framework'
import { Ripple } from 'vuetify/lib/directives'

Vue.use(Vuetify)

export default new Vuetify({
  icons: {
    customVariables: ['~/assets/variables.scss'],
    iconfont: 'mdi',
    values: {
      main: 'mdi-menu',
      add: 'mdi-pencil-plus-outline',
      delete: 'mdi-delete-forever',
      // expand: 'mdi-chevron-down',
      close: 'mdi-close',
      dotsMenu: 'mdi-dots-vertical',
      keywords: 'mdi-folder-pound-outline',
      hash: 'mdi-pound',
      search: 'mdi-magnify',
      bible: 'mdi-cross',
      notes: 'mdi-note-edit-outline',
      note: 'mdi-note',
      topics: 'mdi-file-table-box-multiple-outline',
      topic: 'mdi-form-select',
      submit: 'mdi-button-pointer',
      send: 'mdi-send-variant',
      calendar: 'mdi-calendar-cursor',
      eye: 'mdi-eye',
      back: 'mdi-chevron-left',
      next: 'mdi-chevron-right',
      signIn: 'mdi-login',
      signUp: 'mdi-account-plus',
      signOut: 'mdi-logout'
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
        deepgreen: '#20731C',
        homefone: '#FAFAFA',
        warning: '#FA0',
        delete: '#900'
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
