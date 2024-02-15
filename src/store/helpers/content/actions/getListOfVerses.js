const { getVerseCallback, getVerseHTML } = require('@/store/helpers').default
const { getVersesByRefs } = require('@/db/helpers').default

export async function getListOfVerses ({ state, commit, dispatch }, refs) {
  commit('setProgress', true, { root: true })
  const verses = await getVersesByRefs(refs)

  verses.forEach(verse => Object.assign(verse, {
    callback: getVerseCallback(verse._id),
    html: getVerseHTML(verse)
  }))

  commit('setListOfVerses', verses)

  commit('setProgress', false, { root: true })
}
