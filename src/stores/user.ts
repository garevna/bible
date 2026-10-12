import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { FirebaseError } from 'firebase/app'
import type { User as AuthUser } from 'firebase/auth'

import { defaultAvatar } from '@/assets/default-avatar'
import { defaultTranslation } from '@/configs'
import type { Lang, Profile, User } from '@/types'

import { useAppStore } from './app'
import { useContentStore } from './content'
import { useFirebaseStore } from './firebase'

/** profile of the signed in user, so that the app starts offline too */
const PROFILE_KEY = 'profile'

/** the user took the photo away: the Google one is not shown either */
const NO_PHOTO = 'none'

/** the photo of the profile, or the one of the Google account when the profile has none */
const photoOf = (profilePhoto: string | undefined, authUser: AuthUser) =>
  profilePhoto && profilePhoto !== defaultAvatar ? profilePhoto : authUser.photoURL || ''

export type AuthResult =
  | 'ok'
  | 'wrong-credentials'
  | 'email-in-use'
  | 'invalid-email'
  | 'weak-password'
  | 'cancelled'
  | 'network'
  | 'error'

const authErrors: Record<string, AuthResult> = {
  'auth/invalid-credential': 'wrong-credentials',
  'auth/wrong-password': 'wrong-credentials',
  'auth/user-not-found': 'wrong-credentials',
  'auth/invalid-login-credentials': 'wrong-credentials',
  'auth/email-already-in-use': 'email-in-use',
  'auth/invalid-email': 'invalid-email',
  'auth/missing-email': 'invalid-email',
  'auth/weak-password': 'weak-password',
  'auth/popup-closed-by-user': 'cancelled',
  'auth/cancelled-popup-request': 'cancelled',
  'auth/user-cancelled': 'cancelled',
  'auth/network-request-failed': 'network'
}

function authResult(error: unknown): AuthResult {
  if (!(error instanceof FirebaseError)) return 'error'
  const result = authErrors[error.code]
  result ?? console.error(error)
  return result ?? 'error'
}

export const useUserStore = defineStore('user', () => {
  const userName = ref<string | null>(null)
  const userPhoto = ref<string | null>(null)
  const city = ref<string | null>(null)
  const country = ref<string | null>(null)
  const translation = ref<string>(defaultTranslation)
  const lang = ref<Lang>('ua')
  /** Firebase Auth uid */
  const uid = ref<string | null>(null)
  const email = ref<string | null>(null)

  const signed = computed(() => Boolean(uid.value))
  /** photo of the user, or '' when there is none (the old default picture and NO_PHOTO count as none) */
  const avatar = computed(() =>
    userPhoto.value && userPhoto.value !== defaultAvatar && userPhoto.value !== NO_PHOTO
      ? userPhoto.value
      : ''
  )
  /** 'ІФ' from 'Ірина Филиппова', 'R' from 'reader@example.com' */
  const initials = computed(() =>
    (userName.value || email.value || '?')
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, userName.value ? 2 : 1)
      .map((part) => part[0]!.toUpperCase())
      .join('')
  )
  /** what the header shows */
  const displayName = computed(() => userName.value || email.value || '')

  const profile = (): Profile => ({
    userName: userName.value ?? '',
    avatar: userPhoto.value === NO_PHOTO ? NO_PHOTO : avatar.value,
    city: city.value ?? '',
    country: country.value ?? '',
    lang: lang.value,
    translation: translation.value
  })

  function setUser(user: User) {
    userName.value = user.userName ?? null
    userPhoto.value = user.avatar || null
    city.value = user.city ?? null
    country.value = user.country ?? null
    uid.value = user.uid
    email.value = user.email ?? null
    translation.value = user.translation || defaultTranslation
    lang.value = user.lang || 'ua'
  }

  function clearUser() {
    userName.value = userPhoto.value = city.value = country.value = uid.value = email.value = null
  }

  function updateLocalStorage() {
    localStorage.setItem('translation', translation.value)
    localStorage.setItem('lang', lang.value)
    if (signed.value) localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile(), uid: uid.value }))
  }

  /** Profile from Firestore, or the one saved locally when offline */
  async function loadProfile(userUid: string): Promise<Profile | null> {
    const remote = await useFirebaseStore()
      .getProfile(userUid)
      .catch(() => null)
    if (remote) return remote

    const cached = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null')
    return cached?.uid === userUid ? cached : null
  }

  /** Profile for a new account: what the sign up form or the Google account gives */
  const newProfile = (authUser: AuthUser, data: Profile = {}): Profile => ({
    userName: data.userName || authUser.displayName || '',
    avatar: data.avatar || authUser.photoURL || '',
    city: data.city ?? '',
    country: data.country ?? '',
    lang: data.lang ?? lang.value,
    translation: data.translation ?? translation.value
  })

  /** After any kind of sign in: profile (created for a new account) and the user's data */
  async function enter(authUser: AuthUser, isNew: boolean, data?: Profile) {
    const firebase = useFirebaseStore()

    await useAppStore().withProgress(async () => {
      let userProfile = isNew ? null : await loadProfile(authUser.uid)
      if (!userProfile) {
        userProfile = newProfile(authUser, data)
        firebase.saveProfile(authUser.uid, userProfile)
      }

      setUser({
        ...userProfile,
        avatar: photoOf(userProfile.avatar, authUser),
        uid: authUser.uid,
        email: authUser.email
      })
      updateLocalStorage()

      isNew || (await firebase.read())
      await useContentStore().getChapterContent()
    })
  }

  /** Restores the Firebase Auth session, if any */
  async function initUser() {
    lang.value = (localStorage.getItem('lang') as Lang | null) || 'ua'
    translation.value = localStorage.getItem('translation') || defaultTranslation

    // the old session format (encrypted credentials) is not used any more
    ;['SI', 'avatar', 'location'].forEach((key) => localStorage.removeItem(key))

    const authUser = await useFirebaseStore().waitForAuth()
    if (!authUser) return

    const userProfile = (await loadProfile(authUser.uid)) ?? newProfile(authUser)
    setUser({
      lang: lang.value,
      translation: translation.value,
      ...userProfile,
      avatar: photoOf(userProfile.avatar, authUser),
      uid: authUser.uid,
      email: authUser.email
    })
    updateLocalStorage()
  }

  async function run(action: () => Promise<{ user: AuthUser; isNew: boolean }>, data?: Profile) {
    try {
      const { user, isNew } = (await useAppStore().withProgress(action, { rethrow: true }))!
      await enter(user, isNew, data)
      return 'ok' as const
    } catch (error) {
      return authResult(error)
    }
  }

  /** Email (or the login of an old account) and password */
  const signIn = (emailOrLogin: string, password: string) =>
    run(() => useFirebaseStore().signInWithPassword(emailOrLogin.trim(), password))

  const signInWithGoogle = () => run(() => useFirebaseStore().signInWithGoogle())

  const signUp = (userEmail: string, password: string, data: Profile) =>
    run(() => useFirebaseStore().signUpWithPassword(userEmail.trim(), password, data.userName ?? ''), data)

  async function resetPassword(userEmail: string): Promise<AuthResult> {
    try {
      await useAppStore().withProgress(() => useFirebaseStore().resetPassword(userEmail.trim()), {
        rethrow: true
      })
      return 'ok'
    } catch (error) {
      return authResult(error)
    }
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

  /** a data URL of the photo, or '' to take it away */
  async function updateUserAvatar(value: string) {
    userPhoto.value = value || NO_PHOTO
    await updateProfile({ avatar: userPhoto.value })
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
    uid,
    email,
    signed,
    avatar,
    initials,
    displayName,
    setUser,
    initUser,
    signIn,
    signInWithGoogle,
    signUp,
    resetPassword,
    signOut,
    updateUserLang,
    updateUserTranslation,
    updateUserAvatar,
    updateUserCity,
    updateUserCountry
  }
})
