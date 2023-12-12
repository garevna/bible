import { setSelector } from './setSelector'

export function getSelector () {
  const selector = localStorage.getItem('notes-selector')

  const result = {
    date: null,
    keyword: null,
    topic: {
      _id: null,
      title: ''
    }
  }

  selector
    ? Object.assign(result, JSON.parse(selector))
    : setSelector(result)

  return result
}
