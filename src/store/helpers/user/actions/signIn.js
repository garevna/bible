export async function signIn ({ state, commit, dispatch }) {
  commit('setProgress', true, { root: true })

  dispatch('updateLocalStorage')

  await dispatch('firebase/read', null, { root: true })
  await dispatch('content/getChapterContent', null, { root: true })

  commit('setProgress', false, { root: true })
}
