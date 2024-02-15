export async function setCurrentNote ({ state, commit, dispatch }, note) {
  const { _id, topics, refs, keywords, text } = note
  commit('setCurrentNote', { _id, topics, refs, keywords, text })
  console.log('STATE: CURRENT NOTE\n', state.currentNote)
  await dispatch('getCurrentNoteTopics')
  await dispatch('getCurrentNoteVerses')
}
