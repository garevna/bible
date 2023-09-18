export function getLineRef (covenantIndex, bookIndex, chapterIndex, lineIndex) {
  return `${covenantIndex}.${bookIndex.format()}.${chapterIndex.format()}.${lineIndex.format()}`
}
