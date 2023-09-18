import { addInterval } from './addInterval'

export function selectionChange () {
  const selection = document.getSelection()
  const selectedText = selection.toString()

  let [startIndex, endIndex] = [selection.anchorNode, selection.extentNode]
    .map(node => Number(node?.parentNode?.id))

  console.log('SELECTION:\n', selectedText, startIndex, endIndex)

  let fragments = []

  if (!startIndex || !endIndex) {
    if (selectedText) {
      const source = this.chapterContent.find(string => string.text.indexOf(selectedText) !== -1)
      console.log(source)
      if (source) {
        ;[startIndex, endIndex] = [source.line, source.line]
        fragments = [selectedText]
      }
    } else return
  } else {
    fragments = selection.toString()
      .split('\n')
      .filter(string => string.length)
      .map(string => string.split('\t').join(''))

    fragments.forEach((fragment, index) => {
      fragments[index] = fragments[index].split((startIndex + index + 1).toString()).join('')
    })
  }

  console.log('FRAGMENTS:\n', fragments)

  if (!fragments.length) return

  const updateHighlights = addInterval.bind(this)

  console.log(startIndex, this.chapterContent[startIndex], this.chapterContent[startIndex]?.text)

  const fragment = fragments.shift()

  const begin = this.chapterContent[startIndex].text.indexOf(fragment)
  console.log(selection.anchorOffset, begin, begin + fragment.length - 1)
  console.log(this.chapterContent[startIndex].text.slice(begin, begin + fragment.length - 1))

  updateHighlights(this.chapterContent[startIndex], {
    start: begin,
    end: begin + fragment.length - 1
  })

  if (!fragments.length) return

  fragments.pop()

  console.log(endIndex, this.chapterContent[endIndex].text)

  updateHighlights(this.chapterContent[endIndex], {
    start: 0,
    end: selection.extentOffset
  })

  fragments.forEach((fragment, index) => {
    console.log(startIndex + index + 1, this.chapterContent[startIndex + index + 1].text)
    updateHighlights(this.chapterContent[startIndex + index + 1], {
      start: 0,
      end: fragment.length - 1
    })
  })
}
