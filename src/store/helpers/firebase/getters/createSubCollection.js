const { newSubCollection } = require('@/store/helpers/firebase').default

export const createSubCollection = state => state.db ? newSubCollection.bind(null, state.db) : null
