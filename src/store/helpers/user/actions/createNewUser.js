import { defaultAvatar } from '@/assets/default-avatar'
import { defaultTranslation } from '@/configs'

const subCollectionName = 'creds'

export async function createNewUser ({ getters, commit, dispatch, rootState }, user) {
  commit('setProgress', true, { root: true })

  const {
    userName = '',
    avatar = defaultAvatar,
    city = '',
    country = '',
    lang = 'ua',
    translation = defaultTranslation,
    login,
    password
  } = user

  if (!login || !password) return console.warn(`User login ${login} or password ${password} not valid`)

  const { status, docRef: documentRef } = await getters.createUserDocument(login, { userName, avatar, city, country, lang, translation })

  if (status !== 200) return console.error(`Error ${status}: Failed to create user ${login}`)

  const subCollectionDocData = { login, password }

  const response = await dispatch('firebase/createSubCollection', { documentRef, subCollectionName, subCollectionDocData })

  if (response.status !== 200) return console.error(`Error ${status}: Failed to create subcollection for user ${login}`)

  commit('setUser', { userName, avatar, city, country, translation, lang, login, password })

  dispatch('signIn')

  commit('setProgress', false, { root: true })
}
