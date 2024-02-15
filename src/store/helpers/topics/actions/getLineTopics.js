const { searchLineTopics } = require('@/db/helpers').default

export async function getLineTopics ({ commit, dispatch }, lineRef) {
  if (!lineRef) return dispatch('resetTopicList')

  commit('setProgress', true, { root: true })

  const { status, result: topics } = await searchLineTopics(lineRef)

  commit('content/setLineTopics', status === 200 ? topics : [], { root: true })

  commit('setProgress', false, { root: true })
}
