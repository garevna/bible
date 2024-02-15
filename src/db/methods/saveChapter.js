const { putRecords } = require('@/db/helpers').default

export async function saveChapter (chapterContent, chapterIndex, covenantIndex, bookIndex) {
  const chapter = this.getChapterRef(covenantIndex, bookIndex, chapterIndex)

  const records = chapterContent.map((verse, line) => ({
    _id: this.getLineRef(covenantIndex, bookIndex, chapterIndex, line),
    covenant: covenantIndex,
    book: this.getBookRef(covenantIndex, bookIndex),
    chapter,
    line,
    verse
  }))

  return await putRecords('content', records)
}
