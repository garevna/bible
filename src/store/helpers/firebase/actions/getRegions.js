export async function getRegions ({ getters, commit }) {
  const regions = await getters.getCatalog('geo', 'regions')
  commit('updateCatalog', { regions })
}
