import { doc, deleteDoc } from 'firebase/firestore'

export async function removeDocument (collectionRef, docId) {
  const result = await deleteDoc(doc(collectionRef, docId))

  return result
}
