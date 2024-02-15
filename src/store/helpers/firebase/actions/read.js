import { userStoreNames } from '@/db/db-configs'

const { readData } = require('@/store/helpers/firebase').default

export async function read ({ state, getters, commit, dispatch }) {
  if (!getters.login) return

  commit('setProgress', true, { root: true })

  const refs = userStoreNames.map(name => getters.getUserCollectionRef(name))
  await readData(refs)

  commit('setProgress', false, { root: true })
}
