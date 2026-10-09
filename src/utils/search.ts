/** Lowercased text without punctuation, with apostrophe and letter variants unified */
export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[’ʼ`´']/g, '')
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Search words of a query: normalized, unique, longest first */
export function queryWords(query: string) {
  return Array.from(new Set(normalize(query).split(' ').filter(Boolean))).sort((a, b) => b.length - a.length)
}

const escapeHTML = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Verse text with every occurrence of the words wrapped into <mark>.
 * Matching ignores case, apostrophes and ё/е, like `normalize`.
 */
export function markWords(text: string, words: string[]) {
  if (!words.length) return escapeHTML(text)

  // map each position of the folded text back to the original one
  const folded: string[] = []
  const positions: number[] = []
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (/[’ʼ`´']/.test(char)) continue
    folded.push(char.toLowerCase().replace('ё', 'е'))
    positions.push(i)
  }
  const haystack = folded.join('')

  const marked = new Array<boolean>(text.length).fill(false)
  for (const word of words) {
    let from = 0
    for (let index = haystack.indexOf(word, from); index !== -1; index = haystack.indexOf(word, from)) {
      for (let k = positions[index]; k <= positions[index + word.length - 1]; k++) marked[k] = true
      from = index + word.length
    }
  }

  let html = ''
  let open = false
  for (let i = 0; i < text.length; i++) {
    if (marked[i] !== open) {
      html += open ? '</mark>' : '<mark>'
      open = marked[i]
    }
    html += escapeHTML(text[i])
  }
  return open ? `${html}</mark>` : html
}
