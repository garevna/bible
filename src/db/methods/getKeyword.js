const { getRecordByKey } = require('../helpers').default

export async function getKeyword (keyword) {
  console.log(keyword)
  return await getRecordByKey('keywords', keyword)
}
