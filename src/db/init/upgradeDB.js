import { storeNames, dbKeys } from '../db-configs'

export function upgradeDB (db, transaction) {
  const objectStoreNames = Array.from(db.objectStoreNames)
  for (const storeName of storeNames) {
    if (objectStoreNames.includes(storeName)) db.deleteObjectStore(storeName)

    const store = storeName === 'categories' ? db.createObjectStore(storeName)
      : storeName === 'schedule' ? db.createObjectStore(storeName, { keyPath: 'index', autoIncrement: true })
        : db.createObjectStore(storeName, { keyPath: '_id', unique: true })

    if (dbKeys[storeName]) {
      dbKeys[storeName].forEach(key => {
        store.createIndex(key, key, { multiEntry: true })
      })
    }
  }
}
