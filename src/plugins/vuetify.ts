import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { uk, en, ru } from 'vuetify/locale'

/** Icon aliases used as `$name` in templates, as in the Vue 2 version */
const iconAliases = {
  add: 'mdi-plus-box',
  addNote: 'mdi-note-plus',
  addTopic: 'mdi-playlist-plus',
  addKeyword: 'mdi-pound-box',
  back: 'mdi-chevron-left',
  bible: 'mdi-cross',
  book: 'mdi-book-open-page-variant',
  calendar: 'mdi-calendar-cursor',
  cite: 'mdi-comment-quote-outline',
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
  eye: 'mdi-eye',
  hash: 'mdi-pound',
  hide: 'mdi-cog-off-outline',
  keywords: 'mdi-folder-pound-outline',
  keyword: 'mdi-pound',
  main: 'mdi-menu',
  notes: 'mdi-note-edit-outline',
  note: 'mdi-note',
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
  verse: 'mdi-sticker-text-outline',
  verses: 'mdi-book-cross'
}

export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases: { ...aliases, ...iconAliases },
    sets: { mdi }
  },

  locale: {
    locale: 'uk',
    fallback: 'en',
    messages: { uk, en, ru }
  },

  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#4CAF50',
          secondary: '#0090B0',
          buttons: '#72BF44',
          greentext: '#20731C',
          deepgreen: '#007700',
          homefone: '#FAFAFA',
          background: '#FAFAFA',
          warning: '#FFAA00',
          delete: '#990000',
          comment: '#A0A0A0'
        }
      }
    }
  },

  defaults: {
    VCard: { flat: true, color: 'transparent' },
    VTooltip: { location: 'bottom' }
  }
})
