export function getBookRef (covenantIndex, bookIndex) {
  return `${covenantIndex}.${bookIndex.format()}`
}
