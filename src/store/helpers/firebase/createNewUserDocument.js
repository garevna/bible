import { doc, setDoc } from 'firebase/firestore'

export async function createNewUserDocument (db, documentId, documentData) {
  try {
    const docRef = doc(db, 'users', documentId)
    await setDoc(docRef, documentData)
    return { status: 200, docRef }
  } catch (error) {
    console.error('Error adding document: ', error)
    return { status: 500, docRef: null }
  }
}
