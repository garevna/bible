const { getRecordsByIndex } = require('@/db/helpers').default
const { getHTML } = require('@/store/helpers/content').default

export async function getChapterContent ({ state, getters, commit, dispatch }) {
  commit('setProgress', true, { root: true })
  const { result } = await getRecordsByIndex('content', 'chapter', getters.сhapterRef)
  const chapterContent = JSON.parse(JSON.stringify(result))

  if (getters.signed) {
    const { result: chapterHighlights } = await getRecordsByIndex('highlights', 'chapter', getters.сhapterRef)

    chapterHighlights.forEach(marker => {
      const verse = chapterContent.find(record => record._id === marker._id)
      verse && Object.assign(verse, { colored: marker.colored })
    })

    chapterContent
      .forEach(line => Object.assign(line, { html: getHTML(line) }))
  }
  commit('setChapterContent', chapterContent)
  commit('setProgress', false, { root: true })
}
