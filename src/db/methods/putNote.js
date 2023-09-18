const { getRecordByKey, putRecordByKey } = require('../helpers').default
const { saveFirebaseDocument } = require('@/firebase').default

function pushUnique (arr, item) {
  if (!item) return
  if (!Array.isArray(arr)) arr = []
  if (Array.isArray(item)) {
    arr = Array.from(new Set(arr.concat(item)))
  } else !arr.includes(item) && arr.push(item)
}

export async function putNote (note) {
  const { _id = Date.now().toString(), topics = [], keywords = [], refs = [], text = '' } = note

  let { status, result } = await getRecordByKey('notes', _id)

  if (status === 200) {
    pushUnique(result.refs, refs)
    pushUnique(result.keywords, keywords)
    pushUnique(result.topics, topics)
  } else result = { _id, topics, keywords, refs, text }

  await saveFirebaseDocument('notes', note)

  return await putRecordByKey('notes', _id, result)
}
