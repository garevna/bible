const { putRecords } = require('../helpers').default

export async function saveChapter (chapter, chapterIndex, covenantIndex, bookIndex) {
  const chapterId = this.getChapterRef(covenantIndex, bookIndex, chapterIndex)

  const records = chapter.map((text, num) => ({
    _id: this.getLineRef(covenantIndex, bookIndex, chapterIndex, num),
    covenant: covenantIndex,
    book: this.getBookRef(covenantIndex, bookIndex),
    chapter: chapterId,
    line: num,
    text
  }))

  return await putRecords('content', records)
}
