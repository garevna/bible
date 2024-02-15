const { defaultSelector } = require('@/store/helpers/notes').default

export async function init ({ state, commit, dispatch }) {
  commit('setProgress', true, { root: true })
  const selector = localStorage.getItem('notes-selector') || defaultSelector
  if (selector) {
    const { date, keyword, topic = { _id: null, title: '' } } = JSON.parse(selector)
    commit('setDate', date)
    commit('setKeyword', keyword)
    commit('setTopic', topic)
  }
  await dispatch('getAvailableDates')

  if (!state.date && !state.keyword && !state.topic._id) {
    commit('setDate', state.availableDates.slice(-1)[0])
  }
  await dispatch('getNotes')

  commit('setProgress', false, { root: true })
}
