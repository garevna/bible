const { putRecordByKey } = require('../helpers').default
const { saveFirebaseDocument } = require('@/firebase').default

export async function putKeyword (keyword, lineRef, removing) {
  const { status, result } = await this.getKeyword(keyword)

  const refs = status === 200 ? result.refs : []

  lineRef && !refs.includes(lineRef) && refs.push(lineRef)
  removing && refs.includes(removing) && refs.splice(refs.indexOf(removing), 1)

  const record = { _id: keyword, refs }

  await saveFirebaseDocument('keywords', record)
  await putRecordByKey('keywords', keyword, record)

  return record
}
