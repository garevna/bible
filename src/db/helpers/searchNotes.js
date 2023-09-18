import { openDB } from './openDB'

export async function searchNotes ({ lineRef, keyword, topic, date }) {
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
        // console.log(cursor.value)
        // console.log(!lineRef || refs.includes(lineRef), !keyword || keywords.includes(keyword), !topic || topics.includes(topic), !date || (new Date(Number(_id))).toISOString().slice(0, 10) === date)

        ;(!lineRef || refs.includes(lineRef)) &&
          (!keyword || keywords.includes(keyword)) &&
          (!topic || topics.includes(topic)) &&
          (!date || (new Date(Number(_id))).toISOString().slice(0, 10) === date) &&
          result.push(cursor.value)

        cursor.continue()
      } else {
        resolve({ status: 200, result })
      }
    },
    onerror: event => resolve({ status: 500, result: event.target.error })
  }))
}
