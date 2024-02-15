export async function initContent ({ commit, dispatch }) {
  commit('setProgress', true, { root: true })

  await dispatch('refreshContent')

  commit('setProgress', false, { root: true })
}
