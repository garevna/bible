import { openDB } from './openDB'

export async function searchLineKeywords (lineRef) {
  const response = await openDB()
  if (response.status !== 200) return response

  const { result: db } = response

  const store = db.transaction('keywords', 'readonly')
    .objectStore('keywords')

  const result = []

  return new Promise(resolve => Object.assign(store.openCursor(), {
    onsuccess: event => {
      const cursor = event.target.result
      if (cursor) {
        cursor.value.refs.includes(lineRef) && result.push(cursor.value._id)
        cursor.continue()
      } else {
        resolve({ status: 200, result })
      }
    },
    onerror: event => resolve({ status: 500, result: event.target.error })
  }))
}
