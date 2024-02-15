export function setChapterIndex (state, chapterIndex) {
  Object.assign(state, { chapterIndex })
  localStorage.setItem('chapter', chapterIndex)
}
