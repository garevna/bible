import { collection, doc } from 'firebase/firestore'

import { user } from '@/helpers'

export function getFirebaseCollectionRef (collectionName) {
  if (!user()) return console.warn('User is not defined')

  const db = window[Symbol.for('firebase-DB')]

  const userCollectionRef = collection(db, 'users')
  const userRef = doc(userCollectionRef, user().login)
  const collectionRef = collection(userRef, collectionName)

  return collectionRef
}
