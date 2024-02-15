export async function gotoVerse (verseId) {
  const [covenantIndex, bookIndex, chapterIndex, lineIndex] = verseId.split('.').map(item => Number(item))
  this.$store.commit('content/setCovenant', covenantIndex)
  this.$store.commit('content/selectBook', bookIndex)
  this.$store.commit('content/setChapterIndex', chapterIndex)
  this.$store.commit('content/setLineIndex', lineIndex)
  this.$store.commit('content/setVerseId', verseId)
  this.$store.commit('switchPage', 'bible')
}
