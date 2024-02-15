export function testUserPassword ({ state, commit, dispatch }, password) {
  const hash = require('hash.js').sha256().update(password).digest('hex')
  commit('setPasswordValid', Boolean(state.user) && state.user.password === hash)
  state.passwordValid && dispatch('user/setUser', state.user, { root: true })
}
