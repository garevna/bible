import { openDB } from './openDB'

export const putRecords = async (storeName, records) => new Promise(resolve => {
  openDB(storeName)
    .then((response) => {
      const { status, result: db } = response
      if (status !== 200) return resolve({ status, result: 'Open IndexedDB error' })

      const transaction = Object.assign(db.transaction([storeName], 'readwrite'), {
        oncomplete: event => resolve({ status: 200, type: 'Transaction success' }),
        onerror: event => resolve({ status: event.target.error.code, type: 'Transaction error', error: event.target.error.message })
      })

      const store = transaction.objectStore(storeName)

      records.forEach(record => {
        Object.assign(store.add(record), {
          onsuccess: event => ({ status: 200, type: 'Request to add record' }),
          onerror: event => console.warn({ status: event.target.error.code, type: 'Request to add record', result: record._id, error: event.target.error.message, record })
        })
      })
    })
})
