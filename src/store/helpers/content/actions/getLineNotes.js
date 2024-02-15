const { searchNotes } = require('@/db/helpers').default

export async function getLineNotes ({ commit, dispatch }, lineRef) {
  commit('setProgress', true, { root: true })

  const { status, result } = await searchNotes({ lineRef })

  commit('setLineNotes', status === 200 ? result : [])

  commit('setProgress', false, { root: true })
}
