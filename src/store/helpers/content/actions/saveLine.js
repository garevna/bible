const { putRecordByKey } = require('@/db/helpers').default

export async function saveLine ({ commit }, verse) {
  commit('setProgress', true, { root: true })
  await putRecordByKey('content', verse._id, verse)
  commit('setProgress', false, { root: true })
}
