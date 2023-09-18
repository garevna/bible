const { searchNotes } = require('../helpers').default

export async function getNoteList (payload) {
  const { keyword, lineRef, topic, date } = payload || {}
  const result = (await searchNotes({ keyword, lineRef, topic, date }))?.result || []

  return result.map(record => ({ _id: record._id, text: record.text }))
}
