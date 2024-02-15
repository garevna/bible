import { getFirestore } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { firebaseConfig } from '@/configs'

export function initFirebase () {
  return getFirestore(initializeApp(firebaseConfig))
}
