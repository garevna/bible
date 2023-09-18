const { getAllRecords } = require('../helpers').default

export async function getTopics () {
  const { status, result } = await getAllRecords('topics')

  return status === 200 ? result : []
}
