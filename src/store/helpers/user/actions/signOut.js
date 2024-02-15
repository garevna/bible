export function signOut ({ commit, dispatch }) {
  commit('resetUser')
  dispatch('content/resetLocalDB', null, { root: true })
}
