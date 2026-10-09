import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { initializeApp } from 'firebase/app'
import {
  addDoc,
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
import type { User } from '@/types'
import { chapterOf } from '@/utils/refs'

import { useAppStore } from './app'
import { useUserStore } from './user'

/**
 * Firestore layout:
 *   users/{login}                 - profile (userName, avatar, city, country, lang, translation)
 *   users/{login}/creds/{auto-id} - { login, password }
 *   users/{login}/{keywords|topics|notes|highlights}/{_id}
 *   catalogs/geo                  - { regions: [...], [region]: [...cities] }
 */
export const useFirebaseStore = defineStore('firebase', () => {
  const db = shallowRef<Firestore | null>(null)

  const catalog = shallowRef<{ regions: string[] | null; cities: string[] | null }>({
    regions: null,
    cities: null
  })

  function initFirebase() {
    // the persistent cache keeps writes made offline until they reach the server
    db.value ??= initializeFirestore(initializeApp(firebaseConfig), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    })
  }

  const firestore = () => {
    initFirebase()
    return db.value!
  }

  const getUserRef = (login: string) => doc(firestore(), 'users', login)

  const userRef = computed(() => {
    const { login } = useUserStore()
    return login ? getUserRef(login) : null
  })

  const getUserCollectionRef = (collectionName: UserStoreName) =>
    userRef.value ? collection(userRef.value, collectionName) : null

  /** Profile merged with the credentials, or null when there is no such user */
  async function getUser(login: string): Promise<User | null> {
    const userDocRef = getUserRef(login)
    const user = (await getDoc(userDocRef)).data()
    if (!user) return null

    const creds = await getDocs(collection(userDocRef, 'creds'))
    return { ...user, ...creds.docs[0]?.data() } as User
  }

  /** Needs the server: a write made offline would wait forever, so it fails after a timeout */
  async function createUser(user: User, timeout = 15000) {
    const { login, password, ...profile } = user
    const docRef = getUserRef(login)

    const write = async () => {
      await setDoc(docRef, profile)
      await addDoc(collection(docRef, 'creds'), { login, password })
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    const expired = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('Firestore did not answer: the user was not created')),
        timeout
      )
    })

    try {
      await Promise.race([write(), expired])
    } finally {
      clearTimeout(timer)
    }
  }

  /*
   * IndexedDB is the source of truth; Firestore gets a copy in the background.
   * Firestore write promises resolve only after the server acknowledges them, so awaiting
   * them would hang every save while offline. The SDK queues the writes and sends them later.
   */

  function updateUserData(data: Partial<Omit<User, 'login' | 'password'>>) {
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
    userRef,
    initFirebase,
    getUser,
    createUser,
    updateUserData,
    saveFirebaseDocument,
    deleteDocument,
    read,
    getRegions,
    getRegionCities,
    getCities
  }
})
