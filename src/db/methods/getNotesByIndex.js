import { dbKeys } from '../db-configs'

const { getRecordsByIndex } = require('../helpers').default

export async function getNotesByIndex (indexName, indexValue) {
  const test = indexName && dbKeys.notes.includes(indexName)
  const [index, value] = [
    test ? indexName : 'date',
    test ? indexValue : new Date().toISOString().slice(0, 10)
  ]
  const response = await getRecordsByIndex('notes', index, value)

  console.log(response)
  return response
}
