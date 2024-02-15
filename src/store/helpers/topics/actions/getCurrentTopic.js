const { getRecordByKey } = require('@/db/helpers').default

export async function getCurrentTopic ({ commit }, topicId) {
  if (!topicId) return
  commit('setProgress', true, { root: true })
  const { result: topic } = await getRecordByKey('topics', topicId)
  !topic.order && Object.assign(topic, { order: [] })
  commit('setCurrentTopic', topic)
  commit('setProgress', false, { root: true })
}
