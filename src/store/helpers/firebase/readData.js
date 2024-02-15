import { getUserCollection } from './getUserCollection'
import { userStoreNames } from '@/db/db-configs'

const { clearStore, putRecords } = require('@/db/helpers').default

export async function readData (refs) {
  let promises = refs.map(collectionRef => getUserCollection(collectionRef))

  const responses = await Promise.all(promises)

  const result = userStoreNames
    .reduce((res, storeName, index) => Object.assign(res, { [storeName]: responses[index] }), {})

  result.highlights.forEach(marker => Object.assign(marker, { chapter: marker._id.slice(0, -4) }))

  promises = userStoreNames.map(storeName => clearStore(storeName).then(() => putRecords(storeName, result[storeName])))

  const errors = (await Promise.all(promises)).filter(response => response.status !== 200)
  errors
    .forEach(({ status, result }, index) => console.error(`Error ${status} writing to local db ${userStoreNames[index]}\n`, result))

  return { status: 200 }
}
