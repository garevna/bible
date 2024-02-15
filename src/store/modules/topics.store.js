const state = {
  selectedTopic: null,
  currentTopic: null,
  currentTopicData: [],
  topicList: [],
  topicIdList: [],
  searchResult: []
}

const getters = {
  page: (state, getters, rootState) => rootState.page,
  currentVerse: (state, getters, rootState) => rootState.content.verse,

  newTopic: () => ({
    _id: Date.now().toString(),
    title: '',
    refs: [],
    order: []
  })
}

const mutations = {
  setTopicList: (state, topicList) => Object.assign(state, { topicList }),
  spliceTopicList: (state, index) => state.topicList.splice(index, 1),
  addTopicToList: (state, topic) => state.topicList.push(topic),
  removeTopicFromList: (state, topicId) => state.topicList.removeById(topicId),
  resetTopicList: state => Object.assign(state, { topicList: null }),
  updateTopicInList: (state, { index, topic }) => state.topicList.splice(index, 1, topic),

  setSelectedTopic: (state, selectedTopic) => Object.assign(state, { selectedTopic }),

  setCurrentTopic: (state, currentTopic) => Object.assign(state, { currentTopic }),
  updateCurrentTopic: (state, data) => Object.assign(state.currentTopic, data),
  setCurrentTopicData: (state, currentTopicData) => Object.assign(state, { currentTopicData }),
  removeCurrentTopicDataItem: (state, id) => state.currentTopicData.removeById(id),
  resetCurrentTopicData: state => Object.assign(state, { currentTopicData: null }),

  setTopicIdList: (state, topicIdList) => Object.assign(state, { topicIdList }),

  updateSearchResult: (state, searchResult) => Object.assign(state, { searchResult })
}

const actions = require('@/store/helpers/topics/actions').default

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
