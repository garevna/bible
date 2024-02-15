import { doc, getDoc } from 'firebase/firestore'

export async function getTheCatalog (catalogRef, catalogName = 'geo', collectionName = 'regions') {
  const docRef = doc(catalogRef, catalogName)
  const swap = await getDoc(docRef)
  const data = swap.data()

  return collectionName ? Array.from(new Set(data[collectionName])) : data
}
