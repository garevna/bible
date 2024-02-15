const collectionName = 'keywords'

const { getRecordByKey, putRecordByKey } = require('@/db/helpers').default

export async function removeKeywordFromVerse ({ state, getters, commit, dispatch }, keyword) {
  const { status, result } = await getRecordByKey('keywords', keyword)
  const refs = status === 200 ? result.refs : []

  refs.includes(getters.currentLineId) && refs.splice(refs.indexOf(getters.currentLineId), 1)

  const data = { _id: keyword, refs }

  await dispatch('saveFirebaseDocument', { collectionName, data, id: keyword })
  await putRecordByKey(collectionName, keyword, data)

  commit('updateCurrentKeyword', data)
}
