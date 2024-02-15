import { getDocs } from 'firebase/firestore'

export async function getUserCollection (collectionRef) {
  const swap = await getDocs(collectionRef)

  const result = swap.docs
    .map(doc => Object.assign(doc.data(), { _id: doc.id }))

  return result
}
