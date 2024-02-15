import { defaultTranslation } from '@/configs'

/* eslint-disable no-eval */
const getSecret = eval(process.env.VUE_APP_DECRYPT).bind(null, process.env.VUE_APP_SECRET)

export async function initUser ({ getters, commit, dispatch }) {
  const hash = localStorage.getItem('SI')
  if (!hash) return console.warn('USER IS NOT DEFINED!')

  commit('setProgress', true, { root: true })

  const [userName = '', login, password] = getSecret(hash)
  const avatar = localStorage.getItem('avatar')
  const location = localStorage.getItem('location')

  const { city = '', country = '', lang = 'ua', translation = defaultTranslation } = location ? JSON.parse(location) : {}

  dispatch('setUser', { userName, avatar, city, country, lang, translation, login, password })

  commit('setTranslation', translation, { root: true })
  commit('switchLanguage', lang, { root: true })

  getters.signed && await dispatch('firebase/read', null, { root: true })

  commit('setProgress', false, { root: true })
}
