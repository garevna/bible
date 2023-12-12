import { doc, deleteDoc } from 'firebase/firestore'

import { user } from '@/helpers'
import { getFirebaseCollectionRef } from './getFirebaseCollectionRef'

export async function deleteDocument (collectionName, docId) {
  if (!user()) return console.warn('User is not defined')

  const collectionRef = getFirebaseCollectionRef(collectionName)

  const result = await deleteDoc(doc(collectionRef, docId))

  return result
}
