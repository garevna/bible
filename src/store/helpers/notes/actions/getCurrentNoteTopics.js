const { getTopicsByRefs } = require('@/db/helpers').default

export async function getCurrentNoteTopics ({ state, commit, dispatch }) {
  commit('setProgress', true, { root: true })

  if (!state.currentNote) return console.error('Failed to get note topics. Current note is not defined.')

  const response = await getTopicsByRefs(state.currentNote.topics || [])

  commit('setСurrentNoteTopics', response || [])
  commit('setProgress', false, { root: true })
}
