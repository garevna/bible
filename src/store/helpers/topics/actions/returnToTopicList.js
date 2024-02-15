export function returnToTopicList ({ commit, dispatch }) {
  commit('setCurrentTopic', null)
  dispatch('setPage', 'topics', { root: true })
  localStorage.removeItem('topic')
}
