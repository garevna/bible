const { putRecordByKey } = require('@/db/helpers').default

const { topicGetHelper } = require('@/store/helpers/content').default

const collectionName = 'topics'

export async function addTopicToVerse ({ commit, dispatch }, { topic, lineRef }) {
  commit('setProgress', true, { root: true })

  const { status, result: data, topicId: id, exist } = await topicGetHelper(topic, lineRef)

  console.log('TOPIC GET HELPER RESULT:\n', { status, result: data, topicId: id, exist })

  exist && console.warn('Topic is allready assigned to verse')

  if (!exist || status !== 200) return commit('setProgress', false, { root: true })

  data.refs.push(lineRef)

  await putRecordByKey('topics', id, data)
  await dispatch('firebase/saveFirebaseDocument', { collectionName, data, id }, { root: true })

  commit('addTopicToVerse', data)

  commit('setProgress', false, { root: true })
}
