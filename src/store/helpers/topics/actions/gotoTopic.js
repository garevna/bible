export async function gotoTopic ({ state, commit, dispatch }, topic) {
  if (!topic) return
  const topicId = typeof topic === 'string' ? topic : topic._id
  await dispatch('getCurrentTopic', topicId)
  localStorage.setItem('topic', topicId)
  await dispatch('setPage', 'topic', { root: true })
  await dispatch('getTopicData')
}
