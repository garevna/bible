/* eslint-disable no-eval */

import { user } from './user'
// const { read } = require('@/firebase').default

export function initUser () {
  const getSecret = eval(process.env.VUE_APP_DECRYPT)
  const secret = localStorage.getItem('SI')
  if (secret) {
    const { userName = '', login, password } = getSecret(secret)
    user({ userName, login, password })
    window.dispatchEvent(new Event('user-changed'))
  } else user(null)
  return user()
}
