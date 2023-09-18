export function getChapterRef (covenantIndex, bookIndex, chapterIndex) {
  return `${covenantIndex}.${bookIndex.format()}.${chapterIndex.format()}`
}
