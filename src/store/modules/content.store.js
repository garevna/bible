/* eslint-disable no-unused-vars */
/* eslint-disable no-shadow */
/* eslint-disable no-undef */

import { translationMenuItems, storeNames, cursor } from '@/configs'

const mutations = require('@/store/helpers/content/mutations').default

const {
  refreshContent,
  getBookRef,
  getChapterRef,
  getLineRef
} = require('@/store/helpers/content').default

const host = location.href.slice(-1) === '/' ? location.href.slice(0, -1) : location.href

const state = {
  host,
  covenantIndex: 0,
  books: null,
  bookIndex: null,
  bookTitle: null,
  chapterIndex: null,
  chapterContent: null,
  lineIndex: 0,
  verseId: null,

  highlightColor: '#0000',
  cursor: 'default',
  previousCursorState: {
    highlightColor: '#0000',
    cursor: 'default'
  },

  currentLineId: null,

  verse: null,

  lineTopics: [],
  lineKeywords: [],
  lineNotes: [],

  listOfVerses: []
}

const getters = {
  common: (state, getters, rootState, rootGetters) => rootGetters['language/_common'],
  covenantNames: (state, getters) => getters.common.covenantNames,
  signed: (state, getters, rootState, rootGetters) => rootGetters['user/signed'],
  pathToResource: (state, getters, rootState) => {
    console.log(rootState.translation)
    console.log(translationMenuItems.find(item => item.value === rootState.translation).json)
    return `${state.host}/${translationMenuItems.find(item => item.value === rootState.translation).json}`
  },
  covenantName: (state, getters) => getters.covenantNames[state.covenantIndex],
  bookRef: state => getBookRef(state.covenantIndex, state.bookIndex),
  сhapterRef: state => getChapterRef(state.covenantIndex, state.bookIndex, state.chapterIndex),
  lineRef: state => getLineRef(state.covenantIndex, state.bookIndex, state.chapterIndex, state.lineIndex),
  book: state => state.books && state.bookIndex !== null ? state.books[state.covenantIndex][state.bookIndex] : null,
  chapters: state => state.books && state.bookIndex !== null ? state.books[state.covenantIndex][state.bookIndex].chapters : 0,
  cursorStyle: state => state.cursor === 'default' ? state.cursor : `cursor: url('${state.cursor}'), auto`
}

Object.assign(mutations, {
  updateBooks: (state, books) => Object.assign(state, { books }),

  setChapterContent: (state, chapterContent) => Object.assign(state, { chapterContent }),
  updateChapterLine: (state, { index, updated }) => state.chapterContent.splice(index, 1, updated),

  setCurrentLineId: (state, currentLineId) => Object.assign(state, { currentLineId }),
  setListOfVerses: (state, listOfVerses) => Object.assign(state, { listOfVerses }),

  setLineTopics: (state, lineTopics) => Object.assign(state, { lineTopics }),
  addTopicToVerse: (state, topic) => state.lineTopics.pushUnique(typeof topic === 'string' ? topic : topic._id),
  removeTopicFromVerse: (state, topicId) => state.lineTopics.removeById(topicId),

  setLineKeywords: (state, lineKeywords) => Object.assign(state, { lineKeywords }),
  addKeywordToVerse: (state, keyword) => state.lineKeywords.pushUnique(keyword),
  removeKeywordFromVerse: (state, keyword) => state.lineKeywords.removeById(typeof keyword === 'string' ? keyword : keyword._id),

  setLineNotes: (state, lineNotes) => Object.assign(state, { lineNotes }),
  addNoteToVerse: (state, note) => state.lineNotes.pushUnique(note),
  removeNoteFromVerse: (state, noteId) => state.lineNotes.removeById(noteId),

  setCursor: (state, cursor) => Object.assign(state, { cursor }),
  setHighlightColor: (state, highlightColor) => Object.assign(state, { highlightColor }),

  setVerse: (state, verse) => Object.assign(state, { verse })
})

const actions = require('@/store/helpers/content/actions').default

Object.assign(actions, {
  async selectChapter ({ commit, dispatch }, chapterIndex) {
    commit('setChapterIndex', chapterIndex)
    await dispatch('getChapterContent')
  },

  switchCovenant ({ state, commit }) {
    commit('resetBook')
    commit('setCovenant', Math.abs(state.covenantIndex - 1))
  },

  setCursor (state, cursor) {
    Object.assign(state, { cursor })
  }
})

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
