const { deleteRecord } = require('@/db/helpers')

const collectionName = 'topics'

export async function deleteTopic ({ state, commit, dispatch }, topicId) {
  commit('setProgress', true, { root: true })
  await dispatch('firebase/deleteDocument', { collectionName, docId: topicId }, { root: true })
  await deleteRecord(collectionName, topicId)
  const index = Array.isArray(state.list) ? state.list.findIndex(topic => topic._id === topicId) : -1
  index !== -1 && commit('spliceTopicList', index)
  commit('setProgress', false, { root: true })
}
