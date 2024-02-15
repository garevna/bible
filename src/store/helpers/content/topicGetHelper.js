const { getRecordByKey } = require('@/db/helpers').default

export async function topicGetHelper (topic, lineRef) {
  if (!topic) return console.error('Failed to add topic. Topic is not defined')
  if (!lineRef) return console.error('Failed to add topic: verse id is not defined')

  const topicId = typeof topic === 'string' ? topic : topic._id
  const { status, result } = await getRecordByKey('topics', topicId)

  status !== 200 && console.error(`Failed to update topic. Topic ${topicId} was not found.`)

  console.log('TOPIC:\n', result)
  console.log('TOPIC REFS:', result.refs)
  console.log('LINE REF: ', lineRef)

  return {
    status,
    result,
    topicId,
    exist: result.refs.includes(lineRef)
  }
}
