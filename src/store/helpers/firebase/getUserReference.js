import { collection, doc } from 'firebase/firestore'

export function getUserReference (db, login) {
  const userCollectionRef = collection(db, 'users')
  return doc(userCollectionRef, login)
}
