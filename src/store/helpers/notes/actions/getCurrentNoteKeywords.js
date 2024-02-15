const { getKeywordsByRefs } = require('@/db/helpers').default

export async function getCurrentNoteKeywords ({ state, commit, dispatch }, note) {
  commit('setProgress', true, { root: true })

  if (!state.currentNote) return console.error('Failed to get current note keywords. Current note is not defind.')

  const verses = await getKeywordsByRefs(state.currentNote.keywords)

  commit('setСurrentNoteKeywords', verses)
  commit('setProgress', false, { root: true })
}
