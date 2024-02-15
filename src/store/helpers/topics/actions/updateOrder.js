export async function updateOrder ({ state, commit, dispatch }, items) {
  const actual = (items || state.currentTopicData).map(item => item._id)

  const order = (state.currentTopic.order || []).filter(item => actual.includes(item))

  const uniqueItems = Array.from(new Set(actual))

  if (uniqueItems.isEqual(order)) return

  const rest = uniqueItems.filter(item => !order.includes(item))
  order.push(...rest)

  commit('setProgress', true, { root: true })
  commit('updateCurrentTopic', { order })
  await dispatch('putTopic', state.currentTopic)
  commit('setProgress', false, { root: true })
}
