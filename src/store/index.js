import Vue from 'vue'
import Vuex from 'vuex'
import modules from './modules'

import { footerMenu, langMenuItems, defaultTranslation } from '@/configs'

console.log(langMenuItems)

const { initFirebase } = require('@/store/helpers/firebase').default

const firebaseDB = initFirebase()

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    firebaseDB,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    footerMenu,
    pages: footerMenu.map(item => ({ value: item.value, component: item.component })),
    page: null,
    progress: false
    // lang: 'ua',
    // translation: defaultTranslation
  },

  modules,

  getters: {
    login: (state, getters, rootState) => rootState.user.login,

    currentView (state) {
      const page = state.pages.find(item => item.value === state.page)
      return state.page && page ? page.component : null
    },

    langIcon: state => langMenuItems.find(item => item.value === state.lang)?.icon || require('@/assets/lang.svg'),
    lang: (state, getters, rootState) => rootState('user/lang'),
    translation: (state, getters, rootState) => rootState('user/translation')
  },

  mutations: {
    changeViewport: (state, event) => {
      const { innerWidth: viewportWidth, innerHeight: viewportHeight } = event.target

      Object.assign(state, { viewportWidth, viewportHeight })
    },

    setProgress: (state, val) => {
      Object.assign(state, { progress: val })
    },

    switchPage: (state, page) => Object.assign(state, { page }),

    switchLanguage: (state, lang) => {
      Object.assign(state, { lang })
      localStorage.setItem('lang', lang)
    },

    setTranslation: (state, translation) => {
      Object.assign(state, { translation })
      localStorage.setItem('translation', translation)
    },

    SET_PROPERTY: (state, payload) => {
      Vue.set(payload.object, payload.propertyName, payload.value)
    },
    DELETE_PROPERTY: (state, payload) => {
      Vue.delete(payload.object, payload.propertyName)
    }
  },

  actions: {
    async initPage ({ getters, commit, dispatch }, page) {
      switch (page) {
        case 'topic':
          await dispatch('topics/initTopic')
          break
        case 'topics':
          await dispatch('topics/getTopics')
          break
        case 'notes':
          await dispatch('notes/init')
          break
        case 'keywords':
          await dispatch('keywords/init')
          break
      }
      commit('switchPage', page)
    },

    async init ({ state, getters, commit, dispatch }) {
      dispatch('firebase/initFirebase')
      await dispatch('user/initUser')

      const [lang, translation] = [
        localStorage.getItem('lang') || 'ua',
        localStorage.getItem('translation') || defaultTranslation
      ]
      commit('switchLanguage', lang)
      commit('setTranslation', translation)

      commit('content/initOptions')
      await dispatch('content/initContent')
      await dispatch('content/getBooks')
      const page = getters.login ? localStorage.getItem('page') : 'bible'
      await dispatch('initPage', page)
    },

    async setPage ({ commit, dispatch }, page) {
      localStorage.setItem('page', page)
      await dispatch('initPage', page)
    }
  }
})
