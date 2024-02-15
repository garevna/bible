const { getRecordByKey } = require('@/db/helpers').default

export async function getLine ({ state, commit }, lineRef) {
  commit('setCurrentLineId', lineRef)
  commit('setProgress', true, { root: true })
  const { status, result } = await getRecordByKey('content', lineRef)
  commit('setVerse', status === 200 ? result : null)
  commit('setProgress', false, { root: true })
}
