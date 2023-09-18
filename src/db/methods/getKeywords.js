const { getRecordsByIndex } = require('../helpers').default

export async function getKeywords () {
  return await getRecordsByIndex('keywords')
}
