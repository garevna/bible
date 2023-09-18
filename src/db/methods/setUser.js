import { user } from '@/helpers'

const { read } = require('@/firebase').default

export async function setUser ({ userName, login, password }) {
  this.$root.$emit('progress-on')

  user({ userName, login, password })

  Object.assign(this.$root, { user: { userName, login, password } })

  /* eslint-disable no-eval */

  const setSecret = eval(process.env.VUE_APP_ENCRYPT)
  localStorage.setItem('SI', setSecret({ userName, login, password }))

  await read()

  window.dispatchEvent(new Event('user-changed'))

  this.$root.$emit('progress-off')
}
