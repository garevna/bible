export function selectBook (state, bookIndex) {
  const bookTitle = state.books[state.covenantIndex][bookIndex].title
  Object.assign(state, { bookIndex, bookTitle })
  localStorage.setItem('book-index', bookIndex)
  localStorage.setItem('book-title', bookTitle)
  localStorage.setItem('chapter', 0)
}
