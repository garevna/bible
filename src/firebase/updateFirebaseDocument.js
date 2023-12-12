import { doc, runTransaction } from 'firebase/firestore'

import { getFirebaseCollectionRef } from './getFirebaseCollectionRef'

export async function updateFirebaseDocument (collectionName, data) {
  const collectionRef = getFirebaseCollectionRef(collectionName)

  if (!collectionRef) return

  const docRef = doc(collectionRef, data._id)

  const db = window[Symbol.for('firebase-DB')]

  try {
    await runTransaction(db, async (transaction) => {
      const doc = await transaction.get(docRef)
      if (!doc.exists()) {
        console.warn('Document does not exist!', collectionName, data._id)
        return null
      }

      transaction.update(docRef, data)
        .then(() => console.log('Transaction successfully committed!'))
        .catch(error => console.warn('Error writing document\n', error))
    })
  } catch (error) {
    console.warn('Transaction failed: ', error)
  }
}
