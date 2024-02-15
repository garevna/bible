// import { user } from '@/helpers'

const { read } = require('@/firebase').default

export async function setUser ({ userName, avatar, city, country, login, password }) {
  this.$root.$emit('progress-on')

  // user({ userName, avatar, city, country, login, password })

  Object.assign(this.$root, { user: { userName, avatar, city, country, login, password } })

  /* eslint-disable no-eval */

  const setSecret = eval(process.env.VUE_APP_ENCRYPT).bind(null, process.env.VUE_APP_SECRET)
  localStorage.setItem('SI', setSecret(userName, login, password))
  localStorage.setItem('avatar', avatar)
  localStorage.setItem('location', JSON.stringify({ city, country }))

  await read()

  // this.$root.$emit('user-changed', user())
  this.$root.$emit('progress-off')
}
