/* eslint-disable no-eval */

const setSecret = eval(process.env.VUE_APP_ENCRYPT).bind(null, process.env.VUE_APP_SECRET)

export function updateLocalStorage ({ state, getters }) {
  const { userName, login, password, city, country, translation, lang } = state

  localStorage.setItem('SI', setSecret(userName, login, password))
  localStorage.setItem('avatar', getters.avatar)
  localStorage.setItem('location', JSON.stringify({ city, country, translation, lang }))
}
