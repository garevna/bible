export function getVerseNode ({ _id, text, bookName, chapterNum, line }) {
  const link = Object.assign(document.createElement('small'), {
    className: 'link-to-verse ml-2',
    onclick: function (ev) {
      this.gotoVerse(_id)
    }.bind(this),
    innerText: `(${bookName} ${chapterNum}:${line + 1})`
  })

  const elem = Object.assign(document.createElement('p'), {
    innerHTML: `<transition name="slide-fade">${text}</transition>`
  })

  elem.appendChild(link)

  return elem
}
