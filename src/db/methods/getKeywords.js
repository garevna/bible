const { getRecordsByIndex, searchLineKeywords } = require('../helpers').default

export async function getKeywords (lineRef) {
  const { status, result } = !lineRef
    ? await getRecordsByIndex('keywords')
    : await searchLineKeywords(lineRef)

  return status === 200 ? result : []
}
