const { getTheCatalog } = require('@/store/helpers/firebase').default

export const getCatalog = (state, getters) => getters.catalogRef ? getTheCatalog.bind(null, getters.catalogRef) : null
