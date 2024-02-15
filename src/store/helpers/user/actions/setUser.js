import { defaultAvatar } from '@/assets/default-avatar'
import { defaultTranslation } from '@/configs'

export function setUser ({ state, getters, commit }, user) {
  const { userName, avatar = defaultAvatar, city, country, translation = defaultTranslation, lang = 'ua', login, password } = user

  commit('setUserName', userName)
  commit('setAvatar', avatar)
  commit('setLocation', { city, country, translation, lang })
  commit('setCreds', { login, password })

  commit('setTranslation', translation, { root: true })
  commit('switchLanguage', lang, { root: true })
}
