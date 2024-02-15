const { searchLineKeywords } = require('@/db/helpers').default

export async function getLineKeywords ({ commit, dispatch }, lineRef) {
  commit('setProgress', true, { root: true })

  const { status, result } = await searchLineKeywords(lineRef)

  commit('setLineKeywords', status === 200 ? result : [])

  commit('setProgress', false, { root: true })
}
