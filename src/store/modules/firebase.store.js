const state = {
  db: null,
  passwordValid: false,
  user: null,
  docRef: null,
  catalog: {
    regions: null,
    cities: null
  }
}

const getters = Object.assign(require('@/store/helpers/firebase/getters').default, {
  login: (state, getters, rootState, rootGetters) => rootGetters.login,
  loginExist: state => Boolean(state.user),
  userRef: (state, getters) => getters.login ? getters.getUserRef(getters.login) : null
})

const mutations = {
  setDB: (state, db) => Object.assign(state, { db }),
  setPasswordValid: (state, passwordValid) => Object.assign(state, { passwordValid }),
  setUser: (state, user) => Object.assign(state, { user }),
  setUserRef: (state, userRef) => Object.assign(state, { userRef }),
  setDocRef: (state, docRef) => Object.assign(state, { docRef }),
  updateCatalog: (state, data) => Object.assign(state.catalog, data),
  updateRegions: (state, regions) => Object.assign(state.catalog, { regions })
}

const actions = require('@/store/helpers/firebase/actions').default

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
