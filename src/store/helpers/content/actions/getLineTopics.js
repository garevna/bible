const { searchLineTopics } = require('@/db/helpers').default

export async function getLineTopics ({ commit, dispatch }, lineRef) {
  commit('setProgress', true, { root: true })

  const { status, result } = await searchLineTopics(lineRef)

  commit('setLineTopics', status === 200 ? result : [])

  commit('setProgress', false, { root: true })
}
