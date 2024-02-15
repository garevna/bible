const { getAllRecords } = require('@/db/helpers').default

export async function searchTopics ({ commit }, searchLine) {
  commit('setProgress', true, { root: true })
  const search = searchLine.toLowerCase()
  const { result } = (await getAllRecords('topics'))
  const topics = result.filter(topic => topic.title.toLowerCase().indexOf(search) > -1)
  commit('updateSearchResult', topics)
  commit('setProgress', false, { root: true })
}
