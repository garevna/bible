import { storeNames } from '@/configs'
const { clearStore } = require('@/db/helpers').default

export async function resetLocalDB ({ commit, dispatch }) {
  storeNames.forEach(store => clearStore(store))
  await dispatch('getChapterContent')
}
