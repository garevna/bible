export async function createNote ({ getters, commit, dispatch }, { lineRef, topic, keyword }) {
  const note = getters.newNote
  lineRef && Object.assign(note, { refs: [lineRef] })
  topic && Object.assign(note, { topics: [typeof topic === 'string' ? topic : topic._id] })
  keyword && Object.assign(note, { keywords: [keyword] })
  commit('setCurrentNote', getters.newNote)
  topic && await dispatch('getCurrentNoteTopics')
  lineRef && await dispatch('getCurrentNoteverses')
}
