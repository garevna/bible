const { searchNotes } = require('../helpers').default

export async function getNotes (payload) {
  const { keyword, topic, lineRef, date } = payload || {}

  const { status, result } = await searchNotes({ keyword, topic, lineRef, date })
  return status === 200 ? result : []
}
