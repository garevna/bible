export function setCovenant (state, covenantIndex) {
  Object.assign(state, { covenantIndex })
  localStorage.setItem('covenant', covenantIndex)
}
