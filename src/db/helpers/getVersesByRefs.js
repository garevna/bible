import { openDB } from './openDB'

import { getPromise } from './getPromise'

export const getVersesByRefs = async (refs) => {
  if (!refs || !Array.isArray(refs)) return
  const response = await openDB()
  if (response.status !== 200) return response

  const { result: db } = response

  const transaction = db.transaction(['content', 'books'], 'readonly')
  const [store, bookStore] = [
    transaction.objectStore('content'),
    transaction.objectStore('books')
  ]

  return new Promise(resolve => {
    const promises = refs.map(ref => getPromise(store, ref))
    Promise.all(promises)
      .then(res => {
        const responses = res.filter(item => Boolean(item))
        const bookRefs = Array.from(new Set(responses.map(response => response?.book)))
        const promises = bookRefs.map(bookRef => new Promise(resolve => Object.assign(bookStore.get(bookRef), {
          onsuccess: event => resolve(event.target.result),
          onerror: event => resolve(null)
        })))

        Promise.all(promises)
          .then(books => {
            responses.forEach(response => {
              Object.assign(response, {
                bookName: books.find(book => book._id === response.book)?.title,
                chapterNum: response.chapter.slice(6) - 0 + 1
              })
            })

            resolve(responses)
          })
      })
  })
}
