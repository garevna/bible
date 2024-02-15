export function restoreCursor (state) {
  const { cursor, highlightColor } = state.previousCursorState
  Object.assign(state, { cursor, highlightColor })
}
