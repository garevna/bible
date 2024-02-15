const { getRecordByKey, putRecordByKey } = require('@/db/helpers').default

const { noteGetHelper } = require('@/store/helpers/notes').default

const collectionName = 'notes'

export async function addTopicToNote ({ state, commit, dispatch }, { topic, noteId }) {
  commit('setProgress', true, { root: true })

  const { status, note: data, topicId, exist } = await noteGetHelper(topic, noteId)

  exist && console.warn('Topic is allready assigned to note')

  if (exist || status !== 200) return commit('setProgress', false, { root: true })

  data.topics.push(topicId)

  await putRecordByKey(collectionName, noteId, data)
  await dispatch('firebase/saveFirebaseDocument', { collectionName, data, id: noteId }, { root: true })

  const response = await getRecordByKey('topics', topicId)

  response.status === 200 && commit('addTopicToNote', response.result)

  commit('setProgress', false, { root: true })
}
