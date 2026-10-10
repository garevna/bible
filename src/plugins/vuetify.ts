import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { uk, en, ru } from 'vuetify/locale'

/** Icon aliases used as `$name` in templates, as in the Vue 2 version */
const iconAliases = {
  add: 'mdi-plus-box',
  addNote: 'mdi-note-plus',
  addTopic: 'mdi-package-variant-closed-plus',
  removeTopic: 'mdi-package-variant-closed-remove',
  newTopic: 'mdi-playlist-plus',
  addKeyword: 'mdi-tag-plus',
  removeKeyword: 'mdi-tag-remove',
  addVerse: 'mdi-paperclip-plus',
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
  drag: 'mdi-cursor-move',
  edit: 'mdi-pencil-box',
  editNote: 'mdi-pencil-circle',
  editTopic: 'mdi-playlist-edit',
  eye: 'mdi-eye',
  hash: 'mdi-pound',
  /** switches to the reading mode (no controls) */
  readMode: 'mdi-book-open-page-variant-outline',
  keywords: 'mdi-folder-pound-outline',
  keyword: 'mdi-pound',
  main: 'mdi-menu',
  notes: 'mdi-note-edit-outline',
  note: 'mdi-note',
  remove: 'mdi-paperclip-remove',
  /** link a verse, topic or keyword to a note or verse (the + on a frame) */
  link: 'mdi-plus-circle-outline',
  /** unlink it */
  unlink: 'mdi-minus-circle-outline',
  /** a note's verses (with their number in a badge) */
  noteVerses: 'mdi-script-text-outline',
  deleteNote: 'mdi-note-remove-outline',
  reset: 'mdi-close',
  return: 'mdi-page-previous',
  save: 'mdi-content-save-outline',
  search: 'mdi-magnify',
  send: 'mdi-send-variant',
  /** switches to the editing mode */
  editMode: 'mdi-pencil-outline',
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

/** Vuetify with the colors of the theme (see src/theme) */
export const createAppVuetify = (colors: Record<string, string>) =>
  createVuetify({
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
          colors
        }
      }
    },

    // inputs: outlined with a thin blue focus ring instead of the thick dark border
    // (styles/main.css) and without the grey background of the filled variant
    defaults: {
      VCard: { flat: true, color: 'transparent' },
      VTooltip: { location: 'bottom' },
      VTextField: { variant: 'outlined', color: 'secondary' },
      VTextarea: { variant: 'outlined', color: 'secondary' },
      VAutocomplete: { variant: 'outlined', color: 'secondary' },
      VFileInput: { variant: 'outlined', color: 'secondary' },
      VSelect: { variant: 'outlined', color: 'secondary' }
    }
  })
