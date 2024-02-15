export function resetHighlightning (state) {
  const { cursor, highlightColor } = state
  Object.assign(state, {
    previousCursorState: { cursor, highlightColor },
    cursor: 'default',
    highlightColor: '#0000'
  })
}
