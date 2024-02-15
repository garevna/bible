import { getDoc, setDoc } from 'firebase/firestore'

export async function updateUserData ({ state, getters, commit, dispatch }, userDetails) {
  const userSwap = await getDoc(getters.userRef)
  const userData = userSwap.data()
  await setDoc(getters.userRef, userData)
}
