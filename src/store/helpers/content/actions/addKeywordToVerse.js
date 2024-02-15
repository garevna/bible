const { putRecordByKey } = require('@/db/helpers').default

const { keywordGetHelper } = require('@/store/helpers/content').default

const collectionName = 'keywords'

export async function addKeywordToVerse ({ commit, dispatch }, { keyword, lineRef }) {
  commit('setProgress', true, { root: true })

  const { status, result: data, keywordId: id, exist } = keywordGetHelper(keyword, lineRef)

  !exist && console.warn('Keyword is allready assigned to verse')

  if (!exist || status !== 200) return commit('setProgress', false, { root: true })

  data.refs.push(lineRef)

  await putRecordByKey(collectionName, id, data)
  await dispatch('firebase/saveFirebaseDocument', { collectionName, data, id }, { root: true })

  commit('addKeywordToVerse', data)

  commit('setProgress', false, { root: true })
}
