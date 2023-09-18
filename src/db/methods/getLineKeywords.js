const { searchLineKeywords } = require('../helpers').default

export async function getLineKeywords (lineRef) {
  return (await searchLineKeywords(lineRef))?.result
}
