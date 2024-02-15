import { openDB } from './openDB'

export const deleteRecord = async (storeName, recordId) => {
  if (!storeName || !recordId) return console.error(`Error deleting record.\nInvalid store name ${storeName} or record id  ${recordId}.`)
  const response = await openDB()
  if (response.status !== 200) return response
  const { result: db } = response
  const store = db.transaction([storeName], 'readwrite').objectStore(storeName)
  return new Promise((resolve) => {
    Object.assign(store.delete(recordId), {
      onsuccess: event => resolve({
        status: event.target.result ? 200 : 404,
        result: event.target.result ? event.target.result : `Record ${recordId} not found in db store ${storeName}.`
      }),
      onerror: event => resolve({ status: 500, result: event.target.error })
    })
  })
}
