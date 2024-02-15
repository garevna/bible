const { getAllKeys } = require('@/db/helpers').default

export async function searchKeywords ({ commit }, searchLine) {
  commit('setProgress', true, { root: true })

  const search = searchLine.toLowerCase()

  const { status, result } = await getAllKeys('keywords')

  const searchResult = status === 200
    ? result.filter(keyword => keyword.toLowerCase().indexOf(search) > -1)
    : []

  commit('updateSearchResult', searchResult)

  commit('setProgress', false, { root: true })
}
