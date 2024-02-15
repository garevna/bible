const { putRecordByKey } = require('@/db/helpers').default

export async function updateLine (lineRef, lineContent) {
  return (await putRecordByKey('content', lineRef, lineContent))?.result
}
