export function applyOrder ({ state, commit, dispatch }) {
  const { order = [] } = state.currentTopic

  const list = order.map(id => state.currentTopicData.find(item => item._id === id))

  commit('setCurrentTopicData', list)
}
