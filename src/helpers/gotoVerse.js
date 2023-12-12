export function gotoVerse (verseId) {
  if (verseId.split('.').length < 2) return
  localStorage.removeItem('topic')
  localStorage.setItem('page', 'bible')
  localStorage.setItem('verse', verseId)
  this.$root.$emit('page-changed')
}
