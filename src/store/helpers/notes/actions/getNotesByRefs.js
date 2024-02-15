const { getRecordByKey } = require('@/db/helpers').default

export async function getNotesByRefs ({ commit }, refs) {
  commit('setProgress', true, { root: true })
  const promises = refs.map(ref => getRecordByKey('notes', ref))
  const responses = await Promise.all(promises)

  commit('setProgress', false, { root: true })

  const notes = responses
    .map(({ status, result }) => status === 200 ? result : null)
    .filter(note => Boolean(note))

  commit('setNotes', notes)
}
