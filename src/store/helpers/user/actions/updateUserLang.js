export async function updateUserLang ({ getters, commit, dispatch }, lang) {
  getters.userDocRef && await dispatch('firebase/updateUserData', { lang }, { root: true })
  commit('setLang', lang)
}
