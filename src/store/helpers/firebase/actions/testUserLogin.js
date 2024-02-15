export async function testUserLogin ({ state, getters, commit }, login) {
  commit('setProgress', true, { root: true })
  const user = await getters.getFirebaseUser(login)
  commit('setUser', user.login === login ? user : null)
  commit('setProgress', false, { root: true })
}
