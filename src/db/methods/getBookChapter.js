const { getRecordsByIndex } = require('../helpers').default

export async function getBookChapter (covenant, book, chapter) {
  const covenantIndex = typeof covenant === 'string'
    ? this.covenantNames.findIndex(name => name === covenant)
    : covenant

  // console.log(await this.getBookNames(covenantIndex))

  const bookIndex = typeof book === 'string'
    ? (await this.getBookNames(covenantIndex)).findIndex(book)
    : book

  const response = await getRecordsByIndex('content', 'chapter', `${covenantIndex}.${bookIndex.format()}.${chapter.format()}`)

  return response.result
}
