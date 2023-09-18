const { putRecordByKey } = require('../helpers').default
const { saveFirebaseDocument } = require('@/firebase').default

export async function putHighlight (lineRef, colored) {
  console.log(lineRef, colored)

  await saveFirebaseDocument('highlights', { colored }, lineRef)

  return await putRecordByKey('highlights', lineRef, {
    _id: lineRef,
    chapter: lineRef.slice(0, -4),
    colored
  })
}
