import { openDB } from './openDB'

export const getRecordByIndex = async (storeName, indexName, indexValue) => {
  const response = await openDB()
  if (response.status !== 200) return response

  const { result: db } = response

  const store = db.transaction([storeName], 'readonly').objectStore(storeName)
  const index = store.index(indexName)

  return new Promise((resolve) => {
    Object.assign(index.get(indexValue), {
      onsuccess: event => resolve({
        status: event.target.result ? 200 : 404,
        result: event.target.result ? event.target.result : `The data ${indexValue} not found in db store ${storeName}`
      }),
      onerror: event => resolve({ status: 500, result: event.target.error })
    })
  })
}
