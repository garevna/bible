const { getUserReference } = require('@/store/helpers/firebase').default

export const getUserRef = state => state.db ? getUserReference.bind(null, state.db) : null
