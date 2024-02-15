const options = ['book-index', 'book-title', 'chapter']

export function resetBook (state) {
  options.forEach(key => localStorage.removeItem(key))
  Object.assign(state, { bookIndex: null, bookTitle: null, chapterIndex: null })
}
