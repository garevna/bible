const { /* getRecordByKey, */ putRecordByKey } = require('../helpers').default
const { saveFirebaseDocument } = require('@/firebase').default

// function pushUnique (arr, item) {
//   if (!item) return
//   if (!Array.isArray(arr)) arr = []
//   if (Array.isArray(item)) {
//     arr = Array.from(new Set(arr.concat(item)))
//   } else !arr.includes(item) && arr.push(item)
// }

export async function putNote (note) {
  // const { _id = Date.now().toString(), topics = [], keywords = [], refs = [], text = '' } = note
  //
  // let { status, result } = await getRecordByKey('notes', _id)
  //
  // if (status === 200) {
  //   pushUnique(result.refs, refs)
  //   pushUnique(result.keywords, keywords)
  //   pushUnique(result.topics, topics)
  //   Object.assign(result, { text })
  // } else {
  //   result = { _id, topics, keywords, refs, text }
  // }

  const { _id = Date.now().toString() } = note

  await saveFirebaseDocument('notes', note, _id)

  await putRecordByKey('notes', _id, note).catch(error => console.error('ERROR:\n', error))

  return _id
}
