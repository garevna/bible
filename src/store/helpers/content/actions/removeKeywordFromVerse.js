const { putRecordByKey } = require('@/db/helpers').default

const { keywordGetHelper } = require('@/store/helpers/content')

const collectionName = 'keywords'

export async function removeKeywordFromVerse ({ commit, dispatch }, { keyword, lineRef }) {
  commit('setProgress', true, { root: true })

  const { status, result: data, noteId: id, exist } = keywordGetHelper(keyword, lineRef)

  !exist && console.warn('Keyword is not assigned to verse.')

  if (!exist || status !== 200) return commit('setProgress', false, { root: true })

  data.refs.removeById(lineRef)

  await putRecordByKey(collectionName, id, data)
  await dispatch('firebase/saveFirebaseDocument', { collectionName, data, id }, { root: true })

  commit('removeKeywordFromVerse', id)

  commit('setProgress', false, { root: true })
}
