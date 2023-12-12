const { putRecordByKey } = require('../helpers').default
const { saveFirebaseDocument } = require('@/firebase').default

export async function putTopic (topic) {
  const { _id = Date.now().toString(), title, refs = [] } = topic

  await saveFirebaseDocument('topics', topic)

  await putRecordByKey('topics', _id, {
    _id,
    title,
    refs
  })

  return _id
}
