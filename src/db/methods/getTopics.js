const { getAllRecords, getRecordByKey } = require('../helpers').default

export async function getTopics (refs) {
  if (!Array.isArray(refs)) {
    const { status, result } = await getAllRecords('topics')
    return status === 200 ? result : []
  }

  const responses = await Promise.all(refs.map(ref => getRecordByKey('topics', ref)))
  return responses.map(response => response.result)
}
