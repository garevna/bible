const { clearStore, putRecords } = require('@/db/helpers').default

export async function putContent (content) {
  const { beforeDivider } = require('@/configs/beforeDivider.js')

  ;['books', 'content'].forEach(store => clearStore(store))

  this.bookNames = []

  let covenantIndex = 0

  for (const covenant of content) {
    let bookIndex = 0

    for (const book of covenant.books) {
      this.bookNames.push({
        _id: `${covenantIndex}.${bookIndex.format()}`,
        covenant: covenantIndex,
        book: bookIndex,
        title: book.title,
        chapters: book.chapters.length,
        div: beforeDivider.includes(book.title)
      })

      const promises = book.chapters
        .map((chapter, chapterIndex) => this.saveChapter(chapter, chapterIndex, covenantIndex, bookIndex))

      await Promise.all(promises)
      bookIndex++
    }
    covenantIndex++
  }

  const { status, result } = await putRecords('books', this.bookNames)
  console.log('PUT CONTENT:\n', { status, result })
  return status
}
