const { getUser } = require('@/store/helpers/firebase').default

export const getFirebaseUser = state => state.db ? getUser.bind(null, state.db) : null
