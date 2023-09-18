import { collection, addDoc, doc, setDoc } from 'firebase/firestore'

import { user } from '@/helpers'

async function createUserDocument (documentId, documentData) {
  const db = window[Symbol.for('firebase-DB')]
  try {
    const docRef = doc(db, 'users', documentId)
    await setDoc(docRef, documentData)
    return { status: 200, docRef }
  } catch (error) {
    console.error('Error adding document: ', error)
    return { status: 500, docRef: null }
  }
}

async function createSubCollection (documentRef, subCollectionName, subCollectionDocData) {
  try {
    const subCollectionRef = collection(documentRef, subCollectionName)
    const subCollectionDocRef = await addDoc(subCollectionRef, subCollectionDocData)
    return { status: 200, collectionRef: subCollectionDocRef }
  } catch (error) {
    console.error(`Error adding subcollection ${subCollectionName} to document\n`, error)
    return { status: 500, collectionRef: null }
  }
}

export async function createNewUser ({ userName = '', city = '', country = '', login, password }) {
  if (!login || !password) return console.warn('User creds are not valid', login, password)

  const { status, docRef: userDocRef } = await createUserDocument(login, { userName, city, country })

  if (status !== 200) return null

  const result = await createSubCollection(userDocRef, 'creds', { login, password })

  if (result.status !== 200) return null

  user({ userName, login, password })

  return { userName, login, password }
}
