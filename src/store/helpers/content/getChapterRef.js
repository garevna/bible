export function getChapterRef (covenantIndex, bookIndex, chapterIndex) {
  if (chapterIndex === null) {
    chapterIndex = 0
    localStorage.setItem('chapter', 0)
  }
  return `${covenantIndex}.${bookIndex.format()}.${chapterIndex.format()}`
}
