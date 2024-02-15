import { collection, addDoc } from 'firebase/firestore'

export async function newSubCollection (db, documentRef, subCollectionName, subCollectionDocData) {
  try {
    const subCollectionRef = collection(documentRef, subCollectionName)
    const subCollectionDocRef = await addDoc(subCollectionRef, subCollectionDocData)
    return { status: 200, collectionRef: subCollectionDocRef }
  } catch (error) {
    console.error(`Error adding subcollection ${subCollectionName} to document\n`, error)
    return { status: 500, collectionRef: null }
  }
}
