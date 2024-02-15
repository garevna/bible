const { getAllRecords, getRecordByKey } = require('@/db/helpers').default

export async function getTopics ({ commit }, refs = null) {
  commit('setProgress', true, { root: true })
  if (!Array.isArray(refs)) {
    const { status, result } = await getAllRecords('topics')
    commit('setTopicList', status === 200 ? result : [])
  } else {
    const responses = await Promise.all(refs.map(ref => getRecordByKey('topics', ref)))
    commit('setSearchResult', responses.map(response => response.result))
  }
  commit('setProgress', false, { root: true })
}
