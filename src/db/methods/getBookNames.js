const { getRecordsByIndex } = require('../helpers').default

export async function getBookNames (covenant) {
  const index = typeof covenant === 'string' ? this.covenantNames.findIndex(covenant) : covenant
  const response = await getRecordsByIndex('books', 'covenant', index)
  return response
}
