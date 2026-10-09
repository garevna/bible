import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { FirebaseError } from 'firebase/app'

import { defaultAvatar } from '@/assets/default-avatar'
import { defaultTranslation } from '@/configs'
import type { Lang, Profile, User } from '@/types'

import { useAppStore } from './app'
import { useContentStore } from './content'
import { useFirebaseStore } from './firebase'

/** profile of the signed in user, so that the app starts offline too */
const PROFILE_KEY = 'profile'

export type LoginCheck = 'exists' | 'missing' | 'error'
export type SignInResult = 'ok' | 'wrong-password' | 'error'

export const useUserStore = defineStore('user', () => {
  const userName = ref<string | null>(null)
  const userPhoto = ref<string | null>(null)
  const city = ref<string | null>(null)
  const country = ref<string | null>(null)
  const translation = ref<string>(defaultTranslation)
  const lang = ref<Lang>('ua')
  const login = ref<string | null>(null)
  /** Firebase Auth uid */
  const uid = ref<string | null>(null)

  const signed = computed(() => Boolean(login.value) && Boolean(uid.value))
  const avatar = computed(() => userPhoto.value || defaultAvatar)

  const profile = (): Profile => ({
    userName: userName.value ?? '',
    avatar: avatar.value,
    city: city.value ?? '',
    country: country.value ?? '',
    lang: lang.value,
    translation: translation.value
  })

  function setUser(user: User) {
    userName.value = user.userName ?? null
    userPhoto.value = user.avatar || defaultAvatar
    city.value = user.city ?? null
    country.value = user.country ?? null
    login.value = user.login
    uid.value = user.uid
    translation.value = user.translation || defaultTranslation
    lang.value = user.lang || 'ua'
  }

  function clearUser() {
    userName.value = userPhoto.value = city.value = country.value = login.value = uid.value = null
  }

  function updateLocalStorage() {
    localStorage.setItem('translation', translation.value)
    localStorage.setItem('lang', lang.value)
    if (signed.value) localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile(), login: login.value }))
  }

  /** Profile from Firestore, or the one saved locally when offline */
  async function loadProfile(userLogin: string): Promise<Profile> {
    const remote = await useFirebaseStore()
      .getProfile(userLogin)
      .catch(() => null)
    if (remote) return remote

    const cached = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null')
    return cached?.login === userLogin ? cached : {}
  }

  /** Restores the Firebase Auth session, if any */
  async function initUser() {
    lang.value = (localStorage.getItem('lang') as Lang | null) || 'ua'
    translation.value = localStorage.getItem('translation') || defaultTranslation

    // the old session format (encrypted credentials) is not used any more
    ;['SI', 'avatar', 'location'].forEach((key) => localStorage.removeItem(key))

    const authUser = await useFirebaseStore().waitForAuth()
    const userLogin = authUser?.displayName
    if (!authUser || !userLogin) return

    setUser({
      lang: lang.value,
      translation: translation.value,
      ...(await loadProfile(userLogin)),
      login: userLogin,
      uid: authUser.uid
    })
    updateLocalStorage()
  }

  /** Whether the login exists (sign in) or is taken (sign up) */
  async function checkLogin(userLogin: string): Promise<LoginCheck> {
    const owner = await useAppStore().withProgress(async () => ({
      uid: await useFirebaseStore().loginOwner(userLogin)
    }))
    if (!owner) return 'error'
    return owner.uid ? 'exists' : 'missing'
  }

  /** Signs in, loads the profile and the user's data */
  async function signIn(userLogin: string, password: string): Promise<SignInResult> {
    const app = useAppStore()
    const firebase = useFirebaseStore()

    let userUid: string
    try {
      userUid = (await app.withProgress(() => firebase.signInWithLogin(userLogin, password), {
        rethrow: true
      }))!
    } catch (error) {
      const code = error instanceof FirebaseError ? error.code : ''
      return ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(code)
        ? 'wrong-password'
        : 'error'
    }

    await app.withProgress(async () => {
      setUser({ ...(await loadProfile(userLogin)), login: userLogin, uid: userUid })
      updateLocalStorage()
      await firebase.read()
      await useContentStore().getChapterContent()
    })
    return 'ok'
  }

  /** Creates the account and signs in; returns false when it could not be created */
  async function createNewUser(userLogin: string, password: string, data: Profile) {
    const newProfile: Profile = {
      userName: data.userName ?? '',
      avatar: data.avatar || defaultAvatar,
      city: data.city ?? '',
      country: data.country ?? '',
      lang: data.lang ?? lang.value,
      translation: data.translation ?? translation.value
    }

    const userUid = await useAppStore().withProgress(() =>
      useFirebaseStore().createAccount(userLogin, password, newProfile)
    )
    if (!userUid) return false

    setUser({ ...newProfile, login: userLogin, uid: userUid })
    updateLocalStorage()
    await useContentStore().getChapterContent()
    return true
  }

  async function signOut() {
    await useFirebaseStore().signOutAuth()
    localStorage.removeItem(PROFILE_KEY)
    clearUser()

    await useContentStore().resetLocalDB()
    await useAppStore().setPage('bible')
  }

  async function updateProfile(data: Partial<Profile>) {
    signed.value && useFirebaseStore().updateUserData(data)
    updateLocalStorage()
  }

  async function updateUserLang(value: Lang) {
    lang.value = value
    await updateProfile({ lang: value })
  }

  async function updateUserTranslation(value: string) {
    translation.value = value
    await updateProfile({ translation: value })
  }

  async function updateUserAvatar(value: string) {
    userPhoto.value = value
    await updateProfile({ avatar: value })
  }

  async function updateUserCity(value: string) {
    city.value = value
    await updateProfile({ city: value })
  }

  async function updateUserCountry(value: string) {
    country.value = value
    await updateProfile({ country: value })
  }

  return {
    userName,
    userPhoto,
    city,
    country,
    translation,
    lang,
    login,
    uid,
    signed,
    avatar,
    setUser,
    initUser,
    checkLogin,
    signIn,
    signOut,
    createNewUser,
    updateUserLang,
    updateUserTranslation,
    updateUserAvatar,
    updateUserCity,
    updateUserCountry
  }
})
