const {
  getRecordByKey,
  putRecordByKey
} = require('../helpers').default

export async function assignKeyword (keyword, lineRef) {
  if (!keyword || !lineRef) return console.warn(`Illegal data: keyword ${keyword}, line ref ${lineRef}`)
  const { status, result: line } = await getRecordByKey('content', lineRef)
  if (status !== 200) return console.warn(`Error: ${lineRef} not found`)
  line.keywords.includes(keyword) || line.keywords.push(keyword)
  return await putRecordByKey('content', lineRef, line)
}
