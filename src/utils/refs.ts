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

/**
 * A verse picked in a translation of its own (the verse picker has a local switch):
 * 'synodal:1.000.000.000'. A plain line ref follows the translation chosen in the menu.
 */
export const qualifiedRef = (translation: string, lineRef: string) => `${translation}:${lineRef}`

/** 'synodal:1.000.000.000' -> { translation: 'synodal', lineRef: '1.000.000.000' }; a plain ref has no translation */
export function splitRef(ref: string): { translation: string | null; lineRef: string } {
  const at = ref.indexOf(':')
  return at === -1
    ? { translation: null, lineRef: ref }
    : { translation: ref.slice(0, at), lineRef: ref.slice(at + 1) }
}

/** The translation chosen in the menu: one read online (see src/db/remote.ts), or the one in IndexedDB */
export const loadedTranslation = () =>
  typeof localStorage === 'undefined'
    ? null
    : (localStorage.getItem('remote-translation') ?? localStorage.getItem('content-translation'))

/** The ref points to this verse of the loaded translation: plainly, or with the name of that translation */
export const refersTo = (ref: string, lineRef: string, translation = loadedTranslation()) =>
  ref === lineRef || (translation !== null && ref === qualifiedRef(translation, lineRef))
