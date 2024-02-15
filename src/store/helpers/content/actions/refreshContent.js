const { saveChapter } = require('@/store/helpers/content').default

const { testLocalDB, clearStore, putRecords } = require('@/db/helpers').default
const { beforeDivider } = require('@/configs/beforeDivider.js')

export async function refreshContent ({ state, getters, commit, dispatch }, forced) {
  console.log('FORCED: ', forced)
  if (!forced && await testLocalDB()) {
    console.log('TEST LOCAL DB PASSED')
    await dispatch('getBooks')
    return
  }

  console.log('PATH TO RESOURCE: ', getters.pathToResource)

  const content = await (await fetch(getters.pathToResource)).json()

  console.log('CONTENT:\n', content)

  ;['books', 'content'].forEach(store => clearStore(store))

  const books = []

  let covenantIndex = 0

  for (const covenant of content) {
    let bookIndex = 0

    for (const book of covenant.books) {
      books.push({
        _id: `${covenantIndex}.${bookIndex.format()}`,
        covenant: covenantIndex,
        book: bookIndex,
        title: book.title,
        chapters: book.chapters.length,
        div: beforeDivider.includes(book.title)
      })

      const promises = book.chapters
        .map((chapter, chapterIndex) => saveChapter(chapter, chapterIndex, covenantIndex, bookIndex))

      await Promise.all(promises)
      bookIndex++
    }
    covenantIndex++
  }

  const { status } = await putRecords('books', books)

  status === 200 && await dispatch('getBooks')
}
