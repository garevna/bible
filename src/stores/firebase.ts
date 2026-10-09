import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User as AuthUser
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  type DocumentData,
  type Firestore
} from 'firebase/firestore'

import { firebaseConfig } from '@/configs'
import { clearStore, putRecords, userStoreNames, type UserStoreName } from '@/db'
import type { Profile } from '@/types'
import { loginEmail } from '@/utils/loginEmail'
import { chapterOf } from '@/utils/refs'

import { useAppStore } from './app'
import { useUserStore } from './user'

/**
 * Accounts live in Firebase Auth: email + password or Google.
 * Users of the Vue 2 version keep signing in with their login: the migration script gave
 * them a technical email derived from it (see utils/loginEmail).
 * Firestore layout:
 *   users/{uid}                                    - profile, only for its owner
 *   users/{uid}/{keywords|topics|notes|highlights} - user data, only for its owner
 * The rules are in firestore.rules.
 */
const configured = Boolean(firebaseConfig.apiKey)

export const useFirebaseStore = defineStore('firebase', () => {
  const app = shallowRef<FirebaseApp | null>(null)
  const db = shallowRef<Firestore | null>(null)
  const auth = shallowRef<Auth | null>(null)

  /** the Firebase Auth user, restored by the SDK on start */
  const authUser = shallowRef<AuthUser | null>(null)
  let authReady: Promise<AuthUser | null> | null = null

  function initFirebase() {
    app.value ??= initializeApp(firebaseConfig)
    // the persistent cache keeps writes made offline until they reach the server
    db.value ??= initializeFirestore(app.value, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    })
    // without an API key (no .env.local) the app works for guests only
    if (configured) auth.value ??= getAuth(app.value)
  }

  const firestore = () => {
    initFirebase()
    return db.value!
  }

  const firebaseAuth = () => {
    initFirebase()
    if (!auth.value) throw new Error('Firebase is not configured: see .env.example')
    return auth.value
  }

  /** Resolves with the restored session once the SDK has checked it */
  function waitForAuth() {
    if (!configured) return Promise.resolve(null)
    authReady ??= new Promise((resolve) => {
      onAuthStateChanged(firebaseAuth(), (user) => {
        authUser.value = user
        resolve(user)
      })
    })
    return authReady
  }

  const getUserRef = (uid: string) => doc(firestore(), 'users', uid)

  const userRef = computed(() => {
    const { uid } = useUserStore()
    return uid ? getUserRef(uid) : null
  })

  const getUserCollectionRef = (collectionName: UserStoreName) =>
    userRef.value ? collection(userRef.value, collectionName) : null

  async function getProfile(uid: string): Promise<Profile | null> {
    return ((await getDoc(getUserRef(uid))).data() as Profile | undefined) ?? null
  }

  /** Written in the background like all user data (an awaited write would hang offline) */
  function saveProfile(uid: string, profile: Profile) {
    setDoc(getUserRef(uid), profile, { merge: true }).catch((error) =>
      console.warn('Error saving profile\n', error)
    )
  }

  /** An email, or the login of a user of the Vue 2 version */
  const emailOf = async (emailOrLogin: string) =>
    emailOrLogin.includes('@')
      ? emailOrLogin
      : loginEmail(emailOrLogin, firebaseConfig.authDomain || 'bible.local')

  /** Throws the Firebase error (auth/invalid-credential for a wrong email or password) */
  async function signInWithPassword(emailOrLogin: string, password: string) {
    const { user } = await signInWithEmailAndPassword(firebaseAuth(), await emailOf(emailOrLogin), password)
    authUser.value = user
    return { user, isNew: false }
  }

  async function signUpWithPassword(email: string, password: string, displayName: string) {
    const { user } = await createUserWithEmailAndPassword(firebaseAuth(), email, password)
    displayName && (await updateProfile(user, { displayName }).catch(() => undefined))
    authUser.value = user
    return { user, isNew: true }
  }

  async function signInWithGoogle() {
    const result = await signInWithPopup(firebaseAuth(), new GoogleAuthProvider())
    authUser.value = result.user
    return { user: result.user, isNew: Boolean(getAdditionalUserInfo(result)?.isNewUser) }
  }

  const resetPassword = async (email: string) => sendPasswordResetEmail(firebaseAuth(), email)

  async function signOutAuth() {
    await signOut(firebaseAuth()).catch((error) => console.warn('Sign out failed\n', error))
    authUser.value = null
  }

  /*
   * IndexedDB is the source of truth; Firestore gets a copy in the background.
   * Firestore write promises resolve only after the server acknowledges them, so awaiting
   * them would hang every save while offline. The SDK queues the writes and sends them later.
   */

  function updateUserData(data: Partial<Profile>) {
    if (!userRef.value) return
    setDoc(userRef.value, data, { merge: true }).catch((error) =>
      console.warn('Error updating user\n', error)
    )
  }

  function saveFirebaseDocument(collectionName: UserStoreName, data: DocumentData & { _id?: string }) {
    const collectionRef = getUserCollectionRef(collectionName)
    if (!collectionRef) return

    setDoc(doc(collectionRef, data._id ?? Date.now().toString()), data).catch((error) =>
      console.warn('Error writing document\n', error)
    )
  }

  function deleteDocument(collectionName: UserStoreName, docId: string) {
    const collectionRef = getUserCollectionRef(collectionName)
    if (!collectionRef) return

    deleteDoc(doc(collectionRef, docId)).catch((error) =>
      console.warn(`Failed to delete ${docId} from ${collectionName}:\n`, error)
    )
  }

  /** Replaces the user's local data (keywords, topics, notes, highlights) with the Firestore copy */
  async function read() {
    if (!userRef.value) return

    await useAppStore().withProgress(async () => {
      await Promise.all(
        userStoreNames.map(async (storeName) => {
          const snapshot = await getDocs(getUserCollectionRef(storeName)!)
          const records = snapshot.docs.map((item) => ({ ...item.data(), _id: item.id }))

          if (storeName === 'highlights') {
            records.forEach((marker) => Object.assign(marker, { chapter: chapterOf(marker._id) }))
          }

          await clearStore(storeName)
          await putRecords(storeName, records)
        })
      )
    })
  }

  return {
    db,
    authUser,
    userRef,
    initFirebase,
    waitForAuth,
    saveProfile,
    getProfile,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    resetPassword,
    signOutAuth,
    updateUserData,
    saveFirebaseDocument,
    deleteDocument,
    read
  }
})
