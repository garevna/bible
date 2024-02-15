const { getHTML } = require('@/store/helpers/content').default

const { putRecordByKey } = require('@/db/helpers').default

const { clearHighlights, updateIntervals } = require('@/store/helpers/content/highlights').default

const collectionName = 'highlights'

export async function selectionChange ({ state, commit, dispatch }) {
  const selection = document.getSelection()
  if (selection.anchorNode === null || selection.extentNode === null) return

  const fragments = selection.toString()
    .replace(/\d/g, '')
    .split('\t')
    .join('')
    .split('\n')
    .map(item => item.trim())
    .filter(item => item.length)

  const { chapterContent, highlightColor } = state

  const names = ['anchorNode', 'extentNode']
    .map(key => selection[key].parentNode)
    .map(node => node.tagName !== 'P' ? node.parentNode.id : node.id)

  const [firstIndex, lastIndex] = names.map(name => Number(name.split('.').slice(-1))).sort()

  const starts = fragments
    .map((item, index) => chapterContent[firstIndex + index].verse.indexOf(fragments[index]))
  const ends = fragments
    .map((item, index) => starts[index] + fragments[index].length)

  for (let index = firstIndex; index <= lastIndex; index++) {
    let { _id: id, colored = [], verse } = chapterContent[index]

    const [start, end] = [starts.shift(), ends.shift()]

    if (start === -1 || end === -1) continue

    const addon = { start, end, color: highlightColor }

    colored = clearHighlights(updateIntervals(colored, addon))

    dispatch('firebase/saveFirebaseDocument', { collectionName, data: { colored }, id }, { root: true })
    await putRecordByKey(collectionName, id, {
      _id: id,
      chapter: id.slice(0, -4),
      colored
    })

    const updated = Object.assign({}, state.chapterContent[index], { colored, html: getHTML({ verse, colored }) })

    commit('updateChapterLine', { index, updated })
  }
}
