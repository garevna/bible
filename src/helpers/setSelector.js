const emptySelector = {
  date: null,
  keyword: null,
  topicId: null,
  topicTitle: ''
}

export function setSelector (data) {
  const keys = Object.keys(data)

  const {
    date,
    keyword,
    topicId: _id,
    topicTitle: title
  } = JSON.parse(localStorage.getItem('notes-selector')) || JSON.parse(JSON.stringify(emptySelector))

  const result = {
    date,
    keyword,
    topic: { _id, title }
  }

  keys.forEach(key => Object.assign(result, { [key]: data[key] }))

  localStorage.setItem('notes-selector', JSON.stringify(result))
}
