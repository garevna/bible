import { openDB } from './openDB'

export const putRecordByKey = async (storeName, recordKey, payload) => new Promise((resolve) => {
  openDB(storeName)
    .then((response) => {
      const { status, result: db } = response
      if (status !== 200) {
        resolve({ status, result: 'Open IndexedDB error' })
        return
      }

      const store = db.transaction([storeName], 'readwrite').objectStore(storeName)

      Object.assign(store.put(payload), {
        onsuccess: event => resolve({ status: 200, result: event.target.result }),
        onerror: event => resolve({ status: event.errorCode, result: 'IndexedDB saving data error' })
      })
    })
})
