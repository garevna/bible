const { getVerseCallback, getVerseHTML } = require('@/store/helpers').default
const { searchNotes, getVersesByRefs } = require('@/db/helpers').default

export async function getTopicData ({ state, getters, commit, dispatch }) {
  commit('setProgress', true, { root: true })

  const { _id: topic, refs: lineRefs } = state.currentTopic

  const { result: notes } = await searchNotes({ topic })

  const verses = lineRefs && lineRefs.length ? await getVersesByRefs(lineRefs) : []

  for (const note of notes) {
    const noteVerses = note.refs && note.refs.length
      ? await getVersesByRefs(note.refs)
      : []

    Object.assign(note, {
      type: 'note',
      verses: noteVerses.map(verse => ({
        _id: verse._id,
        type: 'verse',
        callback: getVerseCallback(verse._id),
        html: getVerseHTML(verse)
      }))
    })
  }

  verses.forEach(verse => Object.assign(verse, {
    type: 'verse',
    callback: getVerseCallback(verse._id),
    html: getVerseHTML(verse)
  }))

  const items = notes.concat(verses)

  commit('setCurrentTopicData', items)

  await dispatch('updateOrder')
  dispatch('applyOrder')

  commit('setProgress', false, { root: true })
}
