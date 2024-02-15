const { getAllKeys } = require('@/db/helpers').default

export async function getTopicIdList ({ commit }) {
  commit('setProgress', true, { root: true })
  const list = await getAllKeys('topics')
  commit('setTopicIdList', list)
  commit('setProgress', false, { root: true })
}
