const { getRecordByKey } = require('@/db/helpers').default

export async function noteGetHelper (note, lineRef) {
  if (!note) return console.error('Failed to add note. Note is not defined')
  if (!lineRef) return console.error('Failed to add note: verse id is not defined')

  const noteId = typeof note === 'string' ? note : note._id
  const { status, result } = await getRecordByKey('notes', noteId)

  status !== 200 && console.error(`Failed to update topic. Topic ${noteId} was not found.`)

  return {
    status,
    result,
    noteId,
    exist: result.refs.includes(lineRef)
  }
}
