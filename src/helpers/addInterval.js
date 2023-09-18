// import { saveFirebaseDocument } from '../firebase/saveFirebaseDocument'
import { clearHighlights } from './clearHighlights'
import { updateIntervals } from './updateIntervals'

export async function addInterval (chapterLine, added) {
  if (!chapterLine.colored) chapterLine.colored = []

  Object.assign(added, { color: this.highlightColor })

  // console.log('SOURCE:\n', ...chapterLine.colored.map(item => `${item.start}-${item.end}: ${item.color}\n`))
  // console.log('ADDED:\n', added)

  const result = updateIntervals(chapterLine.colored, added)

  // console.log(`LINE ${chapterLine._id}: HIGHLIGHTS RESULT:\n`, ...result.map(item => `${item.start}-${item.end}: ${item.color}\n`))

  Object.assign(chapterLine, { colored: clearHighlights(result.sort((first, second) => first.start - second.start)) })

  // console.log(chapterLine._id, chapterLine.colored)

  this.$root.contentController.updateLine(chapterLine._id, chapterLine)

  this.$root.contentController.putHighlight(chapterLine._id, chapterLine.colored)

  // await saveFirebaseDocument('highlights', { colored: result }, chapterLine._id)
}
