const { deleteRecord } = require('@/db/helpers').default

const collectionName = 'notes'

export async function removeNote ({ state, commit, dispatch }, note) {
  commit('setProgress', true, { root: true })

  const noteId = typeof note === 'string' ? note : note._id

  await deleteRecord(collectionName, noteId)

  await dispatch('firebase/deleteDocument', { collectionName, docId: noteId }, { root: true })

  commit('removeNote', note)

  commit('setProgress', false, { root: true })
}
