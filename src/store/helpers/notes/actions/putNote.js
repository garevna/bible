const { putRecordByKey } = require('@/db/helpers').default

const collectionName = 'notes'

export async function putNote ({ commit, dispatch }, note) {
  commit('setProgress', true, { root: true })

  const { _id: id = Date.now().toString() } = note

  await dispatch('firebase/saveFirebaseDocument', { collectionName, data: note, id }, { root: true })

  await putRecordByKey('notes', id, note)
    .catch(error => console.error('ERROR:\n', error))

  commit('setProgress', false, { root: true })
}
