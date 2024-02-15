export async function initTopic ({ state, getters, dispatch }) {
  const currentTopicId = localStorage.getItem('topic')
  currentTopicId && await dispatch('getCurrentTopic', currentTopicId)
  currentTopicId && await dispatch('getTopicData')
}
