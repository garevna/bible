const { putRecordByKey } = require('@/db/helpers').default

const collectionName = 'notes'

export async function saveCurrentNote ({ state, commit, dispatch }) {
  commit('setProgress', true, { root: true })

  const { _id: id } = state.currentNote

  await dispatch('firebase/saveFirebaseDocument', { collectionName, data: state.currentNote, id }, { root: true })

  await putRecordByKey('notes', id, state.currentNote)
    .catch(error => console.error('ERROR:\n', error))

  commit('setProgress', false, { root: true })
}
