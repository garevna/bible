export async function updateUserCity ({ getters, commit, dispatch }, city) {
  getters.userDocRef && await dispatch('firebase/updateUserData', { city }, { root: true })
  commit('setCity', city)
}
