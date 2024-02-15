const { putRecordByKey } = require('@/db/helpers').default

const { topicGetHelper } = require('@/store/helpers/content')

const collectionName = 'topics'

export async function removeTopicFromVerse ({ commit, dispatch }, { topic, lineRef }) {
  commit('setProgress', true, { root: true })

  const { status, result: data, topicId: id, exist } = topicGetHelper(topic, lineRef)

  !exist && console.warn('Topic is not assigned to verse')

  if (!exist || status !== 200) return commit('setProgress', false, { root: true })

  data.refs.removeById(lineRef)

  await putRecordByKey('topics', id, data)
  await dispatch('firebase/saveFirebaseDocument', { collectionName, data, id }, { root: true })

  commit('removeTopicFromVerse', id)

  commit('setProgress', false, { root: true })
}
