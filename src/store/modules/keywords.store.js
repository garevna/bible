const state = {
  keywordList: [],
  searchResult: [],
  currentKeyword: null
}

const getters = {
  currentLineId: (state, getters, rootState) => rootState.currentLineId,
  listOfVerses: (state, getters, rootState) => rootState.content.listOfVerses
}

const mutations = {
  setKeywordList: (state, keywordList) => Object.assign(state, { keywordList }),
  setSearchResult: (state, searchResult) => Object.assign(state, { searchResult }),
  setCurrentKeyword: (state, currentKeyword) => Object.assign(state, { currentKeyword }),
  addKeywordToList: (state, keyword) => state.list.push(keyword),
  removeKeywordFromList: (state, keyword) => state.list.removeById(keyword),
  updateSearchResult: (state, searchResult) => Object.assign(state, { searchResult })
}

const actions = require('@/store/helpers/keywords/actions').default

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
