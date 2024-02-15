const { getVersesByRefs } = require('@/db/helpers').default
const { getVerseHTML } = require('@/store/helpers').default

export async function getCurrentNoteVerses ({ state, commit, dispatch }, note) {
  commit('setProgress', true, { root: true })

  if (!state.currentNote) return console.error('Failed to get current note verses. Current note is not defind.')

  const verses = await getVersesByRefs(state.currentNote.refs)

  verses.forEach(verse => Object.assign(verse, { html: getVerseHTML(verse) }))

  commit('setСurrentNoteVerses', verses)
  commit('setProgress', false, { root: true })
}
