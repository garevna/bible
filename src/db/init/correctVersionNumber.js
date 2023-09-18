import { storeNames, dbKeys } from '../db-configs'

import { dbVersionHandler } from './'

export function correctVersionNumber (db) {
  for (const storeName of storeNames) {
    if (!db.objectStoreNames.contains(storeName)) return dbVersionHandler(db.version + 1)
  }

  for (const storeName of storeNames) {
    const store = db.transaction([storeName], 'readwrite').objectStore(storeName)

    const keys = Array.from(store.indexNames)

    if (!dbKeys[storeName]) continue

    if (keys.length !== dbKeys[storeName].length) return dbVersionHandler(db.version + 1)

    for (const key of keys) {
      if (!dbKeys[storeName].includes(key)) return dbVersionHandler(db.version + 1)
    }

    for (const item of dbKeys[storeName]) {
      if (!keys.includes(item)) return dbVersionHandler(db.version + 1)
    }
  }
  return dbVersionHandler(db.version)
}
