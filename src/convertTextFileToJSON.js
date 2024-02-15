const covenantNames = ['Old Testament', 'New Testament']
const newTestamentFirstBookName = 'Matthew'

const element = document.body.appendChild(document.createElement('input'))
element.type = 'file'
element.onchange = function (event) {
  const file = event.target.files[0]
  const reader = new FileReader()
  reader.onload = function (ev) {
    const bible = createBibleJSON(reader.result)
    console.log(JSON.stringify(bible))
  }
  reader.readAsText(file)
}

function createBibleJSON (text) {
  const lines = text.split('\n').map(line => line.trim())

  const tmp = lines.map(line => line.split('\t'))

  let [verses, headers] = [
    tmp.map(record => record.slice(-1)[0]),
    tmp.map(arr => arr[0].split(' '))
  ]

  let [bookNames, chapterIndexes] = [
    headers.map(array => Number(array[0]) ? [array[0], array[1]].join(' ') : array[0]),
    headers.map(arr => Number(arr.slice(-1)[0].split(':')[0]))
  ]

  verses = verses.map((verse, index) => ({
    bookName: bookNames[index],
    chapter: chapterIndexes[index],
    text: verse
  }))

  bookNames = Array.from(new Set(bookNames))

  const index = bookNames.findIndex(item => item === newTestamentFirstBookName)

  const books = [
    bookNames.slice(0, index).map(bookName => createBook(bookName, verses)),
    bookNames.slice(index).map(bookName => createBook(bookName, verses))
  ]

  return generateResult(books)
}

function createBook (bookName, verses) {
  const bookContent = verses.filter(verse => verse.bookName === bookName)

  const chapters = Array.from(new Set(bookContent.map(verse => verse.chapter)))
    .map(chapter => bookContent.filter(verse => verse.chapter === chapter).map(verse => verse.text))

  return {
    title: bookName,
    chapters
  }
}

function generateResult (books) {
  return [
    {
      title: covenantNames[0],
      books: books[0]
    },
    {
      title: covenantNames[1],
      books: books[1]
    }
  ]
}
