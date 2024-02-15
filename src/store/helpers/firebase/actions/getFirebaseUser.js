export async function getFirebaseUser ({ getters, commit }, { login, password }) {
  const user = await getters.getFirebaseUser(login)
  if (user.password === password) commit('user/setUser', user, { root: true })
}
