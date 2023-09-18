const { getRecordsByIndex } = require('../helpers').default

export async function getChapterHighlights (chapter) {
  console.log('CHAPTER: ', chapter)
  const highlights = await getRecordsByIndex('highlights', 'chapter', chapter)
  console.log('HIGHLIGHTS:\n', highlights)
  return highlights?.result || []
}
