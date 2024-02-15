export async function updateUserAvatar ({ getters, commit, dispatch }, avatar) {
  getters.userDocRef && await dispatch('firebase/updateUserData', { avatar }, { root: true })
  commit('setAvatar', avatar)
}
