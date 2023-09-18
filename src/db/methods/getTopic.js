const { getRecordByKey } = require('../helpers').default

export async function getTopic (id) {
  const { status, result } = await getRecordByKey('topics', id)

  return status === 200 ? result : []
}
