const state = require('@/configs/language').default

const getters = Object.keys(state)
  .map(key => ({ [`_${key}`]: (state, getters, rootState) => Object.keys(state[key]).reduce((res, name) => Object.assign(res, { [name]: state[key][name][rootState.lang] }), {}) }))
  .reduce((res, getter) => Object.assign(res, getter), {})

export default {
  namespaced: true,
  state,
  getters
}
