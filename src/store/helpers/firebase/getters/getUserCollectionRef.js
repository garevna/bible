import { collection } from 'firebase/firestore'

export const getUserCollectionRef = (state, getters) => collectionName => getters.userRef ? collection(getters.userRef, collectionName) : null
