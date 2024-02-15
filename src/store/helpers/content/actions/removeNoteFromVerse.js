const { putRecordByKey } = require('@/db/helpers').default

const { noteGetHelper } = require('@/store/helpers/content')

const collectionName = 'notes'

export async function removeNoteFromVerse ({ commit, dispatch }, { note, lineRef }) {
  commit('setProgress', true, { root: true })

  const { status, result: data, noteId: id, exist } = noteGetHelper(note, lineRef)

  !exist && console.warn('Note is not assigned to verse')

  if (!exist || status !== 200) return commit('setProgress', false, { root: true })

  data.refs.removeById(lineRef)

  await putRecordByKey(collectionName, id, data)
  await dispatch('firebase/saveFirebaseDocument', { collectionName, data, id }, { root: true })

  commit('removeNoteFromVerse', id)

  commit('setProgress', false, { root: true })
}
