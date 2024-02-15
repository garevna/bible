import { getBookRef } from './getBookRef'
import { getChapterRef } from './getChapterRef'
import { getLineRef } from './getLineRef'

const { putRecords } = require('@/db/helpers').default

export async function saveChapter (chapterContent, chapterIndex, covenantIndex, bookIndex) {
  const chapter = getChapterRef(covenantIndex, bookIndex, chapterIndex)

  const records = chapterContent.map((verse, line) => ({
    _id: getLineRef(covenantIndex, bookIndex, chapterIndex, line),
    covenant: covenantIndex,
    book: getBookRef(covenantIndex, bookIndex),
    chapter,
    line,
    verse
  }))

  return await putRecords('content', records)
}
