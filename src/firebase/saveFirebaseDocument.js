import { doc, setDoc } from 'firebase/firestore'

import { getFirebaseCollectionRef } from './getFirebaseCollectionRef'

export async function saveFirebaseDocument (collectionName, data, id) {
  const collectionRef = getFirebaseCollectionRef(collectionName)

  if (!collectionRef) return

  const docRef = doc(collectionRef, data._id || id || Date.now().toString())

  const result = await setDoc(docRef, data).catch(error => console.warn('Error writing document\n', error))

  return result
}
