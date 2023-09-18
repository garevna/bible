import { user } from '@/helpers'

const { clearStore } = require('../helpers').default

export async function resetUser () {
  this.$root.$emit('progress-on')

  user.reset()

  Object.assign(this.$root, { user: null })

  localStorage.removeItem('SI')

  ;['keywords', 'topics', 'notes', 'highlights']
    .forEach(storeName => clearStore(storeName))

  window.dispatchEvent(new Event('user-exit'))

  this.$root.$emit('progress-off')
}
