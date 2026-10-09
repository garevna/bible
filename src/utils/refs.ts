/** Replaces Number.prototype.format: 7 -> '007' */
export const pad3 = (num: number) => num.toString().padStart(3, '0')

export const getBookRef = (covenantIndex: number, bookIndex: number) => `${covenantIndex}.${pad3(bookIndex)}`

export const getChapterRef = (covenantIndex: number, bookIndex: number, chapterIndex: number) =>
  `${getBookRef(covenantIndex, bookIndex)}.${pad3(chapterIndex)}`

export const getLineRef = (
  covenantIndex: number,
  bookIndex: number,
  chapterIndex: number,
  lineIndex: number
) => `${getChapterRef(covenantIndex, bookIndex, chapterIndex)}.${pad3(lineIndex)}`

/** '1.004.002.010' -> [1, 4, 2, 10] */
export const parseLineRef = (lineRef: string) => lineRef.split('.').map(Number)

/** The chapter ref a line ref belongs to: '1.004.002.010' -> '1.004.002' */
export const chapterOf = (lineRef: string) => lineRef.slice(0, -4)
