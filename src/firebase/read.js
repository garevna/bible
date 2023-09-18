import { getFirebaseData } from './getFirebaseData'

const { clearStore, putRecords } = require('@/db/helpers').default

const storeNames = ['keywords', 'topics', 'notes', 'highlights']

export async function read () {
  const promises = storeNames
    .map(collectionName => getFirebaseData(collectionName))

  const [keywords, topics, notes, highlights = []] = await Promise.all(promises)

  highlights.forEach(marker => Object.assign(marker, { chapter: marker._id.slice(0, -4) }))

  const result = { keywords, topics, notes, highlights }

  for (const storeName of storeNames) {
    await clearStore(storeName)
    const { status, res } = await putRecords(storeName, result[storeName])
    status !== 200 && console.error(`Error ${status} writing to local db ${storeName}\n`, res)
  }

  return { status: 200 }
}
