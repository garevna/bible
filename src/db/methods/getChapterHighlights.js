const { getRecordsByIndex } = require('../helpers').default

export async function getChapterHighlights (chapter) {
  const highlights = await getRecordsByIndex('highlights', 'chapter', chapter)
  return highlights?.result || []
}
