import { openDB } from './openDB'

export async function getTopicsByRefs (refs) {
  if (!Array.isArray(refs)) return console.warn('Topic refs are required')

  const response = await openDB()
  if (response.status !== 200) return response

  const { result: db } = response

  const store = db
    .transaction('topics', 'readonly')
    .objectStore('topics')

  const result = []

  return new Promise(resolve => {
    for (const id of refs) {
      Object.assing(store.get(id), {
        onsuccess: response => result.push({ status: 200, result: response, error: null }),
        onerror: event => result.push({ status: 400, result: null, error: event.target.error })
      })
    }
  })
}
