import { collection, getDocs } from 'firebase/firestore/lite'

export async function getSnapshot (db, collectionName) {
  return await getDocs(collection(db, collectionName))
}
