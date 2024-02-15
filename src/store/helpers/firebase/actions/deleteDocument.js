const { removeDocument } = require('@/store/helpers/firebase').default

export async function deleteDocument ({ state, getters, commit }, { collectionName, docId }) {
  commit('setProgress', true, { root: true })
  if (!getters.login) throw new Error('Deleting failed: user is not defined')

  const collectionRef = getters.getUserCollectionRef(collectionName)
  await removeDocument(collectionRef, docId)
    .catch(err => console.warn(`Failed to delete ${docId} from ${collectionName}:\n`, err))

  commit('setProgress', false, { root: true })
}
