import { collection, doc, getDoc, getDocs } from 'firebase/firestore'

export async function getUser (db, login) {
  const userCollectionRef = collection(db, 'users')
  const userDocRef = doc(userCollectionRef, login)
  const userSwap = await getDoc(userDocRef)
  const user = userSwap.data()

  if (!user) return 404

  const credsRef = collection(userDocRef, 'creds')
  const swap = await getDocs(credsRef)
  Object.assign(user, swap.docs[0].data())

  return user
}
