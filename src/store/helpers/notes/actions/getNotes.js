const { searchNotes } = require('@/db/helpers').default

export async function getNotes ({ state, commit }, payload) {
  commit('setProgress', true, { root: true })

  const defaultDate = state.availableDates?.slice(-1) || new Date().toISOString().slice(0, 10)

  let { keyword = null, topic = null, lineRef = null, date = null } = payload || state

  if (!keyword && !topic && !lineRef && !date) date = defaultDate

  const topicId = topic ? (typeof topic === 'string' ? topic : topic._id) : null

  const { status, result } = await searchNotes({ keyword, topic: topicId, lineRef, date })

  commit('setNotes', status === 200 ? result : [])

  commit('setProgress', false, { root: true })
}
