import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
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
  updateDoc,
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
 * Accounts live in Firebase Auth (email/password, the email is derived from the login,
 * see utils/loginEmail). Firestore layout:
 *   logins/{login}                                   - { uid }: who owns the login, readable by anyone
 *   users/{login}                                    - profile + uid, only for its owner
 *   users/{login}/{keywords|topics|notes|highlights} - user data, only for its owner
 *   catalogs/geo                                     - { regions: [...], [region]: [...cities] }
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

  const catalog = shallowRef<{ regions: string[] | null; cities: string[] | null }>({
    regions: null,
    cities: null
  })

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

  const emailOf = (login: string) => loginEmail(login, firebaseConfig.authDomain || 'bible.local')

  const getUserRef = (login: string) => doc(firestore(), 'users', login)

  const userRef = computed(() => {
    const { login } = useUserStore()
    return login ? getUserRef(login) : null
  })

  const getUserCollectionRef = (collectionName: UserStoreName) =>
    userRef.value ? collection(userRef.value, collectionName) : null

  /** uid of the owner of the login, or null when the login is free */
  async function loginOwner(login: string): Promise<string | null> {
    const data = (await getDoc(doc(firestore(), 'logins', login))).data()
    return data?.uid ?? null
  }

  async function getProfile(login: string): Promise<Profile | null> {
    const data = (await getDoc(getUserRef(login))).data()
    if (!data) return null
    const { uid: _uid, ...profile } = data
    return profile as Profile
  }

  /** Throws the Firebase error (auth/invalid-credential for a wrong password) */
  async function signInWithLogin(login: string, password: string) {
    const { user } = await signInWithEmailAndPassword(firebaseAuth(), await emailOf(login), password)
    authUser.value = user
    return user.uid
  }

  /**
   * Creates the Auth account and the login and profile documents.
   * Firestore writes need the server, and a write made offline would wait forever,
   * so they fail after a timeout; the Auth account is removed then.
   */
  async function createAccount(login: string, password: string, profile: Profile, timeout = 15000) {
    const { user } = await createUserWithEmailAndPassword(firebaseAuth(), await emailOf(login), password)

    let timer: ReturnType<typeof setTimeout> | undefined
    const expired = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('Firestore did not answer: the user was not created')),
        timeout
      )
    })

    try {
      await Promise.race([
        (async () => {
          await updateProfile(user, { displayName: login })
          await setDoc(doc(firestore(), 'logins', login), { uid: user.uid })
          await setDoc(getUserRef(login), { ...profile, uid: user.uid })
        })(),
        expired
      ])
    } catch (error) {
      await user.delete().catch(() => undefined)
      throw error
    } finally {
      clearTimeout(timer)
    }

    authUser.value = user
    return user.uid
  }

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
    updateDoc(userRef.value, data).catch((error) => console.warn('Error updating user\n', error))
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

  async function getCatalog(catalogName = 'geo', collectionName = 'regions') {
    const data = (await getDoc(doc(collection(firestore(), 'catalogs'), catalogName))).data()
    return data ? Array.from(new Set<string>(data[collectionName])) : []
  }

  async function getRegions() {
    const regions = await useAppStore().withProgress(() => getCatalog('geo', 'regions'))
    catalog.value = { ...catalog.value, regions: regions ?? [] }
  }

  async function getRegionCities(region: string) {
    const cities = await useAppStore().withProgress(() => getCatalog('geo', region))
    catalog.value = { ...catalog.value, cities: cities ?? [] }
  }

  async function getCities(country: string) {
    await useAppStore().withProgress(async () => {
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country })
      })
      const { data } = await response.json()
      catalog.value = { ...catalog.value, cities: data }
    })
  }

  return {
    db,
    catalog,
    authUser,
    userRef,
    initFirebase,
    waitForAuth,
    loginOwner,
    getProfile,
    signInWithLogin,
    createAccount,
    signOutAuth,
    updateUserData,
    saveFirebaseDocument,
    deleteDocument,
    read,
    getRegions,
    getRegionCities,
    getCities
  }
})
