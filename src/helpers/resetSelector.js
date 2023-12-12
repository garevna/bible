import { getSelector } from './getSelector'

const available = ['date', 'keyword', 'topic']

export function resetSelector (propNames) {
  const selector = getSelector()

  for (const propName of propNames) {
    if (!available.includes(propName)) continue
    propName !== 'topic'
      ? localStorage.setItem('notes-selector', Object.assign(selector, { [propName]: null }))
      : localStorage.setItem('notes-selector', Object.assign(selector, { topicId: null, topicTitle: '' }))
  }
}
