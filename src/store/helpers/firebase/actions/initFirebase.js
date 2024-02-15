import { getFirestore } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { firebaseConfig } from '@/configs'

export function initFirebase ({ commit }) {
  const db = getFirestore(initializeApp(firebaseConfig))
  commit('setDB', db)
}
