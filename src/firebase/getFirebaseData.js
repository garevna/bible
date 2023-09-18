import { getDocs } from 'firebase/firestore'

import { user } from '@/helpers'
import { getFirebaseCollectionRef } from './getFirebaseCollectionRef'

export async function getFirebaseData (collectionName) {
  if (!user()) return console.warn('User is not defined')

  const collectionRef = getFirebaseCollectionRef(collectionName)
  const swap = await getDocs(collectionRef)

  const result = swap.docs
    .map(doc => Object.assign(doc.data(), { _id: doc.id }))

  return result
}
