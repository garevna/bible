import { doc, setDoc } from 'firebase/firestore'

export async function saveFirebaseDocument ({ getters }, { collectionName, data, id }) {
  const collectionRef = getters.getUserCollectionRef(collectionName)

  if (!collectionRef) return

  const docRef = doc(collectionRef, data._id || id || Date.now().toString())

  await setDoc(docRef, data)
    .catch(error => console.warn('Error writing document\n', error))
}
