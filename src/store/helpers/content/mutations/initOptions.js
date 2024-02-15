const contentParams = ['covenant', 'book-index', 'chapter']
const addons = ['book-title', 'verse']

const defaultValues = [1, 0, 0]

const { getRecordByKey } = require('@/db/helpers').default
const { getBookRef } = require('@/store/helpers/content').default

export function initOptions (state) {
  const [covenantIndex, bookIndex, chapterIndex] = contentParams
    .map(key => localStorage.getItem(key))
    .map((value, index) => value ? Number(value) : defaultValues[index])

  const [bookTitle = '', verseId] = addons.map(key => localStorage.getItem(key))

  if (!bookTitle) {
    getRecordByKey('books', getBookRef(covenantIndex, bookIndex))
      .then(({ status, result }) => Object.assign(state, { bookTitle: result ? result.title : '' }))
  }

  Object.assign(state, { covenantIndex, bookIndex, bookTitle, chapterIndex, verseId })
}
