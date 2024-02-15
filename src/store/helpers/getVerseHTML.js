export function getVerseHTML ({ _id, bookName, chapterNum, line, verse }) {
  const anchor = `<small class="link-to-verse" @click="$root.$gotoVerse('${_id}')">(${bookName} ${chapterNum}:${line + 1})</small>`
  return `${verse} ${anchor}`
}
