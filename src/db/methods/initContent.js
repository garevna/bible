const { putRecords } = require('../helpers').default

export async function initContent () {
  this.$root.$emit('progress-on')

  const host = location.href.slice(-1) === '/' ? location.href.slice(0, -1) : location.href
  const pathToResource = `${host}/bible-ukr.json`

  const content = await (await fetch(pathToResource)).json()

  const { beforeDivider } = require('../../configs/beforeDivider.js')

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

  await putRecords('books', this.bookNames)

  this.$root.$emit('progress-off')
  this.$root.$emit('content-ready')
}
