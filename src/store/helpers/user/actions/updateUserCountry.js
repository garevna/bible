export async function updateUserCountry ({ getters, commit, dispatch }, country) {
  getters.userDocRef && await dispatch('firebase/updateUserData', { country }, { root: true })
  commit('setCountry', country)
}
