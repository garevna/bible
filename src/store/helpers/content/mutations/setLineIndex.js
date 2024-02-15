export function setLineIndex (state, lineIndex) {
  Object.assign(state, { lineIndex })
  localStorage.setItem('line', lineIndex)
}
