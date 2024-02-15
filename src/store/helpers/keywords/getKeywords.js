const { getAllRecords, searchLineKeywords } = require('@/db/helpers').default

export async function getKeywords (lineRef) {
  const { status, result } = !lineRef
    ? await getAllRecords('keywords')
    : await searchLineKeywords(lineRef)

  return status === 200 ? result : []
}
