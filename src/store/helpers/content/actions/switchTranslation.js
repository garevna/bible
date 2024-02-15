export async function switchTranslation ({ getters, commit, dispatch }, translation) {
  commit('setProgress', true, { root: true })

  commit('setTranslation', translation, { root: true })

  await dispatch('user/updateUserTranslation', { translation }, { root: true })

  await dispatch('refreshContent', true)

  commit('setProgress', false, { root: true })
}
