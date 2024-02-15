export async function updateTopicNotes ({ state, getters, commit, dispatch }) {
  commit('setProgress', true, { root: true })

  const notes = state.currentTopicData.filter(item => item.type === 'note')

  for (const note of notes) {
    const { _id, keywords, topics, text } = note
    const refs = note.verses.map(verse => verse._id)
    dispatch('notes/putNote', { _id, refs, keywords, topics, text }, { root: true })
  }

  commit('setProgress', false, { root: true })
}
