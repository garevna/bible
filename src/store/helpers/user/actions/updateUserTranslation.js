export async function updateUserTranslation ({ getters, commit, dispatch }, translation) {
  getters.userDocRef && await dispatch('firebase/updateUserData', { translation }, { root: true })
  commit('setTranslation', translation)
}
