import { openDB } from './openDB'

import { getPromise } from './getPromise'

export const getNotesByRefs = async (refs) => {
  if (!refs || !Array.isArray(refs)) return
  const response = await openDB()
  if (response.status !== 200) return response

  const { result: db } = response

  const transaction = db.transaction(['notes'], 'readonly')
  const store = transaction.objectStore('notes')

  return new Promise(resolve => {
    const promises = refs.map(ref => getPromise(store, ref))
    Promise.all(promises)
      .then(res => resolve(res.filter(item => Boolean(item))))
  })
}
