const { getRecordsByIndex } = require('../helpers').default

export async function getChapterHighlights (chapter) {
  const { status, result } = await getRecordsByIndex('highlights', 'chapter', chapter)
  return status === 200 ? result : []
}
