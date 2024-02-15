const state = {
  notes: [],

  date: null,
  keyword: null,
  topic: null,

  currentNote: null,
  currentNoteTopics: [],
  currentNoteVerses: [],

  availableDates: null
}

const getters = {
  newNote: () => ({
    _id: Date.now().toString(),
    refs: [],
    topics: [],
    keywords: [],
    text: ''
  })
}

const mutations = {
  setCurrentNote: (state, currentNote) => Object.assign(state, { currentNote }),
  setСurrentNoteVerses: (state, currentNoteVerses) => Object.assign(state, { currentNoteVerses }),
  setСurrentNoteTopics: (state, currentNoteTopics) => Object.assign(state, { currentNoteTopics }),

  updateCurrentNoteText: (state, text) => Object.assign(state.currentNote, { text }),

  setNotes: (state, notes) => Object.assign(state, { notes }),

  addNote: (state, note) => state.notes.push(note),
  removeNote: (state, note) => state.notes.removeById(typeof note === 'string' ? note : note._id),

  addTopicToCurrentNote: (state, topic) => {
    state.currentNote.topics.push(topic._id)
    state.currentNoteTopics.push(topic)
  },

  removeTopicFromCurrentNote: (state, topicId) => {
    state.currentNote.topics.removeById(topicId)
    state.currentNoteTopics.removeById(topicId)
  },

  addVerseToCurrentNote: (state, verse) => {
    state.currentNote.refs.push(verse._id)
    state.currentNoteVerses.push(verse)
  },

  removeVerseFromCurrentNote: (state, verseId) => {
    state.currentNote.refs.removeById(verseId)
    state.currentNoteVerses.removeById(verseId)
  },

  addKeywordToCurrentNote: (state, keyword) => {
    keyword && state.currentNote.keywords.push(typeof keyword === 'string' ? keyword : keyword._id)
  },

  removeKeywordFromCurrentNote: (state, keywordId) => {
    state.currentNote.keywords.removeById(keywordId)
  },

  setNoteSelector: state => {
    const { date, topic, keyword } = state
    const selector = JSON.stringify({ date, topic, keyword })
    localStorage.setItem('notes-selector', selector)
  },

  setAvailableDates: (state, availableDates) => Object.assign(state, { availableDates }),

  setDate: (state, date) => Object.assign(state, { date }),
  setTopic: (state, topic) => Object.assign(state, { topic }),
  setKeyword: (state, keyword) => Object.assign(state, { keyword })
}

const actions = Object.assign(require('@/store/helpers/notes/actions').default, {
  async refreshNoteList ({ state, commit, dispatch }) {
    await dispatch('getNotes')
  },

  updateDate ({ commit, dispatch }, selectedDate) {
    commit('setDate', selectedDate)
    commit('setNoteSelector')
    dispatch('refreshNoteList')
  },

  updateKeyword ({ commit, dispatch }, keyword) {
    commit('setKeyword', keyword)
    commit('setNoteSelector')
    dispatch('refreshNoteList')
  },

  updateTopic ({ commit, dispatch }, topic) {
    commit('setTopic', topic)
    commit('setNoteSelector')
    dispatch('refreshNoteList')
  },

  resetCurrentNote ({ commit }) {
    commit('setCurrentNote', null)
    commit('setNoteTopics', [])
    commit('setNoteVerses', [])
  },

  resetAll ({ commit, dispatch }) {
    commit('setNotes', null)
    dispatch('resetCurrentNote')
    commit('setDate', null)
    commit('setKeyword', null)
    commit('setTopic', null)
  }
})

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
