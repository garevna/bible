import { openDB } from './openDB'
import { dbKeys } from '../db-configs'

export const getAllKeys = async (storeName, indexName) => {
  const response = await openDB()
  if (response.status !== 200) return response

  const { result: db } = response

  const test = dbKeys[storeName].includes(indexName)

  const store = db.transaction([storeName], 'readonly')
    .objectStore(storeName)
  const index = test ? store.index(indexName) : store

  return new Promise((resolve) => {
    Object.assign(index.getAllKeys(), {
      onsuccess: event => resolve({
        status: event.target.result ? 200 : 404,
        result: event.target.result ? event.target.result : `The keys for ${indexName} not found in db store ${storeName}`
      }),
      onerror: event => resolve({ status: 500, result: event.target.error })
    })
  })
}
