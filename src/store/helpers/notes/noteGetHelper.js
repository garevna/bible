const { getRecordByKey } = require('@/db/helpers').default

const errorText = 'Failed to add or remove topic from note.'

export async function noteGetHelper (topic, noteId) {
  if (!topic) return console.error(`${errorText} Topic is not defined.`)
  if (!noteId) return console.error(`${errorText} Note id is not defined`)

  const topicId = typeof topic === 'string' ? topic : topic._id

  const { status, result: note } = await getRecordByKey('notes', noteId)

  status !== 200 && console.error(`${errorText} Note ${noteId} was not found.`)

  console.log(topicId, note.topics)

  return {
    status,
    note,
    topicId,
    exist: note.topics.includes(topicId)
  }
}
