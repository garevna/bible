const { putRecordByKey } = require('../helpers').default
const { saveFirebaseDocument } = require('@/firebase').default

export async function putKeyword (keyword, lineRef) {
  const { status, result: found } = await this.getKeyword(keyword)
  const refs = status === 200 ? found.refs : []
  lineRef && !refs.includes(lineRef) && refs.push(lineRef)

  await saveFirebaseDocument('keywords', { _id: keyword, refs })

  return await putRecordByKey('keywords', keyword, {
    _id: keyword,
    refs
  })
}
