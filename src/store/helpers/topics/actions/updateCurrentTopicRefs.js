export function updateCurrentTopicRefs ({ state, commit }) {
  const refs = state.currentTopicData
    .filter(item => item.type === 'verse')
    .map(verse => verse._id)
  commit('updateCurrentTopic', { refs })
}
