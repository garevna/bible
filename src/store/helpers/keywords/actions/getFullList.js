const { getAllRecords } = require('@/db/helpers').default

export async function getFullList ({ commit }) {
  commit('setProgress', true, { root: true })
  const { status, result } = await getAllRecords('keywords')

  commit('setKeywordList', status === 200 ? result : [])
  commit('setProgress', false, { root: true })
}
