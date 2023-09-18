// import { openDB } from './openDB'

export const deleteRecordsByIndex = async (storeName, indexName, indexValue) => {
  // if (!storeName || !indexName) return console.error(`Error deleting records.\nInvalid store name ${storeName} or index name ${indexName}`)
  // if (!indexValue) return console.warn(`Store: ${storeName}: You should define index value to delete records by index ${indexName}`)
  // const response = await openDB()
  // if (response.status !== 200) return response
  // const { result: db } = response
  // const store = db.transaction([storeName], 'readwrite').objectStore(storeName)
  // const index = indexName ? store.index(indexName) : store
  // return new Promise((resolve) => {
  //   Object.assign(index.delete(IDBKeyRange.only(indexValue)), {
  //     onsuccess: event => resolve({
  //       status: event.target.result ? 200 : 404,
  //       result: event.target.result ? event.target.result : `The data ${indexValue} not found in db store ${storeName} for index ${indexName}`
  //     }),
  //     onerror: event => resolve({ status: 500, result: event.target.error })
  //   })
  // })
}
