export function replaceChapter (chapter) {
  const lineRef = localStorage.getItem('verse')
  const newLineRef = lineRef
    ? lineRef
      .split('.')
      .map((item, index) => index === 2 ? chapter.toString().padStart(3, '0') : item)
      .join('.')
    : null
  newLineRef && localStorage.setItem('verse', newLineRef)
}
