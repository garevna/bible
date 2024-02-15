import { collection } from 'firebase/firestore'

export const catalogRef = state => state.db ? collection(state.db, 'catalogs') : null
