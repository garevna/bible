const { createNewUserDocument } = require('@/store/helpers/firebase').default

export const createUserDocument = state => state.db ? createNewUserDocument.bind(null, state.db) : null
