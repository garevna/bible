const { rebuildOrder } = require('@/store/helpers/topics').default

export async function saveCurrentTopic ({ state, commit, dispatch }) {
  await dispatch('updateTopicNotes')
  const order = rebuildOrder(state.currentTopicData)
  commit('updateCurrentTopic', { order })
  dispatch('updateCurrentTopicRefs')
  await dispatch('putTopic', state.currentTopic)
}
