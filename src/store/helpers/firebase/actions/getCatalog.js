export async function getCatalog ({ state, getters, commit }, { catalogName = 'geo', collectionName = 'regions' }) {
  const catalog = await getters.getCatalog(catalogName, collectionName)
  commit('updateCatalog', { [collectionName === 'regions' ? 'regions' : 'cities']: catalog })
}
