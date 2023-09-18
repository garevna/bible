const { searchLineTopics, getAllRecords } = require('../helpers').default

export async function getLineTopics (lineRef) {
  return lineRef
    ? (await searchLineTopics(lineRef))?.result
    : await getAllRecords('topics')
}
