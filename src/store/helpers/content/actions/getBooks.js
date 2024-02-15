const { getRecordsByIndex } = require('@/db/helpers').default

export async function getBooks ({ state, commit }) {
  const books = []
  const promises = [0, 1].map(covenantIndex => getRecordsByIndex('books', 'covenant', covenantIndex))
  const responses = await Promise.all(promises)
  responses.forEach(response => books.push(response.status === 200 ? response.result : []))
  commit('updateBooks', books)
}
