import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import hash from 'hash.js'

import { defaultAvatar } from '@/assets/default-avatar'
import { defaultTranslation } from '@/configs'
import type { Lang, User } from '@/types'

import { useAppStore } from './app'
import { useContentStore } from './content'
import { useFirebaseStore } from './firebase'

type Encrypt = (secret: string, userName: string, login: string, password: string) => string
type Decrypt = (secret: string, encrypted: string) => [string, string, string]

/**
 * The saved session is encrypted with functions whose source lives in .env.local
 * (VITE_ENCRYPT / VITE_DECRYPT), exactly as in the Vue 2 version.
 */
function loadCipher<T>(source: string | undefined): T | null {
  if (!source) return null
  try {
    return (0, eval)(source) as T
  } catch (error) {
    console.error('Invalid session cipher in .env.local', error)
    return null
  }
}

const secret = import.meta.env.VITE_SECRET
const encrypt = loadCipher<Encrypt>(import.meta.env.VITE_ENCRYPT)
const decrypt = loadCipher<Decrypt>(import.meta.env.VITE_DECRYPT)

export const sha256 = (text: string) => hash.sha256().update(text).digest('hex')

const storedProfileKeys = ['SI', 'avatar', 'location'] as const

export const useUserStore = defineStore('user', () => {
  const userName = ref<string | null>(null)
  const userPhoto = ref<string | null>(null)
  const city = ref<string | null>(null)
  const country = ref<string | null>(null)
  const translation = ref<string>(defaultTranslation)
  const lang = ref<Lang>('ua')
  const login = ref<string | null>(null)
  /** sha256 of the password, as stored in Firestore */
  const password = ref<string | null>(null)

  /** user found by login while signing in, waiting for the password check */
  const candidate = ref<User | null>(null)

  const signed = computed(() => Boolean(login.value) && Boolean(password.value))
  const avatar = computed(() => userPhoto.value || defaultAvatar)

  function setUser(user: User) {
    userName.value = user.userName ?? null
    userPhoto.value = user.avatar || defaultAvatar
    city.value = user.city ?? null
    country.value = user.country ?? null
    login.value = user.login
    password.value = user.password
    translation.value = user.translation || defaultTranslation
    lang.value = user.lang || 'ua'
  }

  function updateLocalStorage() {
    if (encrypt && login.value && password.value) {
      localStorage.setItem('SI', encrypt(secret, userName.value ?? '', login.value, password.value))
    }
    localStorage.setItem('avatar', avatar.value)
    localStorage.setItem('location', JSON.stringify({ city: city.value, country: country.value }))
    localStorage.setItem('translation', translation.value)
    localStorage.setItem('lang', lang.value)
  }

  async function refreshUser(userLogin: string) {
    await useAppStore().withProgress(async () => {
      const user = await useFirebaseStore().getUser(userLogin)
      if (!user) return
      setUser(user)
      updateLocalStorage()
      await useFirebaseStore().read()
    })
  }

  /** Restores the session saved in localStorage */
  async function initUser() {
    const storedLang = localStorage.getItem('lang') as Lang | null
    const storedTranslation = localStorage.getItem('translation')

    lang.value = storedLang || 'ua'
    translation.value = storedTranslation || defaultTranslation

    const session = localStorage.getItem('SI')
    if (!session || !decrypt) return

    const [storedName = '', storedLogin, storedPassword] = decrypt(secret, session)
    if (!storedLogin || !storedPassword) return

    if (!storedLang || !storedTranslation) return refreshUser(storedLogin)

    const { city: storedCity = null, country: storedCountry = null } = JSON.parse(
      localStorage.getItem('location') || '{}'
    )

    setUser({
      userName: storedName,
      avatar: localStorage.getItem('avatar') || defaultAvatar,
      city: storedCity,
      country: storedCountry,
      lang: lang.value,
      translation: translation.value,
      login: storedLogin,
      password: storedPassword
    })
  }

  async function signIn() {
    await useAppStore().withProgress(async () => {
      updateLocalStorage()
      await useFirebaseStore().read()
      await useContentStore().getChapterContent()
    })
  }

  /** Looks the login up in Firestore; returns true when such a user exists */
  async function testUserLogin(userLogin: string) {
    const user = await useAppStore().withProgress(() => useFirebaseStore().getUser(userLogin))
    candidate.value = user ?? null
    return Boolean(user)
  }

  /** Signs the candidate in when the password matches */
  async function testUserPassword(plainPassword: string) {
    const valid = Boolean(candidate.value) && candidate.value!.password === sha256(plainPassword)
    if (valid) {
      setUser(candidate.value!)
      candidate.value = null
      await signIn()
    }
    return valid
  }

  async function createNewUser(user: Omit<User, 'password'> & { password: string }) {
    if (!user.login || !user.password) return console.warn('User login or password is not valid')

    const newUser: User = {
      userName: '',
      avatar: defaultAvatar,
      city: '',
      country: '',
      lang: lang.value,
      translation: translation.value,
      ...user,
      password: sha256(user.password)
    }

    await useAppStore().withProgress(() => useFirebaseStore().createUser(newUser))
    setUser(newUser)
    await signIn()
  }

  async function signOut() {
    storedProfileKeys.forEach((key) => localStorage.removeItem(key))
    userName.value = userPhoto.value = city.value = country.value = login.value = password.value = null

    await useContentStore().resetLocalDB()
    await useAppStore().setPage('bible')
  }

  async function updateProfile(data: Partial<Omit<User, 'login' | 'password'>>) {
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
    password,
    candidate,
    signed,
    avatar,
    setUser,
    initUser,
    refreshUser,
    signIn,
    signOut,
    testUserLogin,
    testUserPassword,
    createNewUser,
    updateUserLang,
    updateUserTranslation,
    updateUserAvatar,
    updateUserCity,
    updateUserCountry
  }
})
