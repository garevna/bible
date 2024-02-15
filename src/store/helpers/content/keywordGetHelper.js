const { getRecordByKey } = require('@/db/helpers').default

export async function keywordGetHelper (keyword, lineRef) {
  if (!keyword) return console.error('Failed to add keyword. Keyword is not defined')
  if (!lineRef) return console.error('Failed to add keyword: verse id is not defined')

  const keywordId = typeof keyword === 'string' ? keyword : keyword._id
  const { status, result } = await getRecordByKey('keywords', keywordId)

  status !== 200 && console.error(`Failed to update topic. Topic ${keywordId} was not found.`)

  return {
    status,
    result,
    keywordId,
    exist: result.refs.includes(lineRef)
  }
}
