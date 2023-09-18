const { putRecordByKey } = require('../helpers').default
const { saveFirebaseDocument } = require('@/firebase').default

export async function putTopic (topic) {
  console.log('TOPIC:\n', topic)
  const { _id = Date.now().toString(), title, refs = [], keywords = [], notes = [] } = topic

  await saveFirebaseDocument('topics', topic)

  return await putRecordByKey('topics', _id, {
    _id,
    title,
    refs,
    keywords,
    notes
  })
}
