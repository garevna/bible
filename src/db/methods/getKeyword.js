const { getRecordByKey } = require('../helpers').default

export async function getKeyword (keyword) {
  return await getRecordByKey('keywords', keyword)
}
