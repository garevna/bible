const collectionName = 'keywords'

const { putRecordByKey } = require('@/db/helpers').default

export async function putKeyword ({ state, commit, dispatch }, keyword) {
  const data = keyword || state.currentKeyword
  if (!data || !data._id) return console.warn('Illegal keyword: ', data)

  commit('setProgress', true, { root: true })

  await dispatch('firebase/saveFirebaseDocument', { collectionName, data, id: data._id }, { root: true })
  await putRecordByKey('keywords', data._id, data)

  commit('setProgress', false, { root: true })
}
