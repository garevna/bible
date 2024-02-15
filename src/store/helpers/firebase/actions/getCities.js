const { getCitiesFromExternalAPI } = require('@/store/helpers/firebase').default

export async function getCities ({ state, getters, commit, dispatch }, country) {
  commit('setProgress', true, { root: true })
  const cities = await getCitiesFromExternalAPI(country)
  commit('updateCatalog', { cities })
  commit('setProgress', false, { root: true })
}
