const { getRecordByKey } = require('../helpers').default

export async function getNote (_id) {
  const { status, result } = await getRecordByKey('notes', _id)

  return status === 200 ? result : null
}
