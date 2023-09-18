const { getRecordByKey } = require('../helpers').default

export async function getLine (lineRef) {
  const { status, result } = await getRecordByKey('content', lineRef)
  return status === 200 ? result : null
}
