const { putRecordByKey } = require('@/db/helpers').default

const collectionName = 'topics'

export async function putTopic ({ state, commit, dispatch }, topic) {
  commit('setProgress', true, { root: true })
  const { _id = Date.now().toString(), title, refs = [], order = [] } = topic

  await dispatch('firebase/saveFirebaseDocument', { collectionName, data: { _id, title, refs, order }, id: _id }, { root: true })
  await putRecordByKey('topics', _id, { _id, title, refs, order })

  const index = Array.isArray(state.topicList) ? state.topicList.findIndex(rec => rec._id === topic._id) : -1

  Array.isArray(state.topicList) && index !== -1
    ? commit('updateTopicInList', { index, topic: JSON.parse(JSON.stringify({ _id, title, refs, order })) })
    : commit('addTopicToList', { _id, title, refs, order })

  commit('setProgress', false, { root: true })
}
