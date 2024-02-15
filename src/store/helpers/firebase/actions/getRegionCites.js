export async function getRegionCites ({ getters, commit }, region) {
  const cities = await getters.getCatalog('geo', region)
  commit('updateCatalog', { cities })
}
