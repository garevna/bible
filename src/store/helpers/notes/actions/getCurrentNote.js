const { getRecordByKey } = require('@/db/helpers').default

export async function getCurrentNote ({ commit }, _id) {
  commit('setProgress', true, { root: true })
  const { status, result } = await getRecordByKey('notes', _id)

  commit('setCurrentNote', status === 200 ? result : null)
  commit('setProgress', false, { root: true })
}
