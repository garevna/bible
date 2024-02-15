export function setVerseId (state, verseId) {
  Object.assign(state, { verseId })
  localStorage.setItem('verse', verseId)
}
