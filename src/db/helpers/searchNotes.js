import { openDB } from './openDB'

export async function searchNotes ({ lineRef, keyword, topic, date = null }) {
  const response = await openDB()
  if (response.status !== 200) return response

  const { result: db } = response

  const store = db.transaction('notes', 'readonly')
    .objectStore('notes')

  const result = []

  return new Promise(resolve => Object.assign(store.openCursor(), {
    onsuccess: event => {
      const cursor = event.target.result
      if (cursor) {
        const { refs, topics, keywords, _id } = cursor.value
        const _date = new Date(Number(_id)).toISOString().slice(0, 10)

        ;(!lineRef || refs.includes(lineRef)) &&
          (!keyword || keywords.includes(keyword)) &&
          (!topic || topics.includes(topic)) &&
          (!date || _date === date) &&
          result.pushUnique(cursor.value)

        cursor.continue()
      } else {
        resolve({ status: 200, result })
      }
    },
    onerror: event => resolve({ status: 500, result: event.target.error })
  }))
}
