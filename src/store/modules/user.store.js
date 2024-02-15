/* eslint-disable no-unused-vars */
/* eslint-disable no-shadow */
/* eslint-disable no-undef */

import { defaultAvatar } from '@/assets/default-avatar'

const state = {
  userName: null,
  userPhoto: null,
  city: null,
  country: null,
  translation: null,
  lang: null,
  login: null,
  password: null
}

const getters = {
  signed: state => Boolean(state.login) && Boolean(state.password),
  avatar: state => state.userPhoto || defaultAvatar,
  getUserDocRef: (state, getters, rootState, rootGetters) => rootGetters['firebase/getUserRef'],
  userDocRef: (state, getters) => state.login ? getters.getUserDocRef(state.login) : null,
  createUserDocument: (state, getters, rootState, rootGetters) => rootGetters['firebase/createUserDocument']
}

const mutations = {
  setCreds: (state, { login, password }) => Object.assign(state, { login, password }),
  setUserName: (state, userName) => Object.assign(state, { userName }),
  setAvatar: (state, userPhoto) => Object.assign(state, { userPhoto }),
  setLocation: (state, { city, country }) => Object.assign(state, { city, country }),
  setCityList: (state, cityList) => Object.assign(state, { cityList }),
  setTranslation: (state, translation) => Object.assign(state, { translation }),
  setLang: (state, lang) => Object.assign(state, { lang }),

  resetUser (state) {
    ['SI', 'avatar', 'location'].forEach(key => localStorage.removeItem(key))
    Object.keys(state).forEach(key => Object.assign(state, { [key]: null }))
    dispatch('initPage', 'bible', { root: true })
  }
}

const actions = require('@/store/helpers/user/actions').default

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
