/**
 * Translations of the Bible read online from the YouVersion Platform (licensed there, e.g. the New Russian
 * Translation of Biblica): the app never gets them whole, only the list of the books and one chapter at a
 * time; the answers are kept a day in the cache of Cloudflare, nowhere else.
 *   GET /bible/:translation/books                      the books: titles and the verses of each chapter
 *   GET /bible/:translation/:covenant/:book/:chapter    the verses of a chapter (0-based numbers)
 * These are public, as the Bible page is for guests too; the key stays here.
 */

/** the translations of the app read online: its value → the id of the Bible on the YouVersion Platform */
export const REMOTE_BIBLES: Record<string, number> = { nrt: 143 }

const API = 'https://api.youversion.com/v1/bibles'
const DAY = 24 * 60 * 60

interface ApiBook {
  id: string
  title: string
  canon: 'old_testament' | 'new_testament' | string
  chapters: { id: string; verses: { id: string }[] }[]
}

export interface RemoteBooks {
  title: string
  copyright: string
  covenants: { title: string; books: { code: string; title: string; chapters: number[] }[] }[]
}

const COVENANTS: Record<string, [string, string]> = {
  ru: ['Ветхий Завет', 'Новый Завет'],
  uk: ['Старий Заповіт', 'Новий Заповіт'],
  en: ['Old Testament', 'New Testament']
}

async function api<T>(path: string, key: string, fetcher: typeof fetch): Promise<T> {
  const response = await fetcher(`${API}/${path}`, {
    headers: { 'X-YVP-App-Key': key, Accept: 'application/json' }
  })
  if (!response.ok) throw new RemoteError(response.status)
  return (await response.json()) as T
}

export class RemoteError extends Error {
  constructor(readonly status: number) {
    super(`YouVersion: ${status}`)
  }
}

/** The books of a Bible in the order of the app: the Old Testament, then the New */
export async function remoteBooks(id: number, key: string, fetcher: typeof fetch): Promise<RemoteBooks> {
  const [bible, { data }] = await Promise.all([
    api<{ localized_title?: string; title: string; copyright: string | null; language_tag: string }>(
      String(id),
      key,
      fetcher
    ),
    api<{ data: ApiBook[] }>(`${id}/books`, key, fetcher)
  ])
  const titles = COVENANTS[bible.language_tag] ?? COVENANTS.en!
  const of = (canon: string) =>
    data
      .filter((book) => book.canon === canon)
      .map((book) => ({
        code: book.id,
        title: book.title,
        chapters: book.chapters.map((chapter) => chapter.verses.length)
      }))
  return {
    title: bible.localized_title ?? bible.title,
    copyright: bible.copyright ?? '',
    covenants: [
      { title: titles[0], books: of('old_testament') },
      { title: titles[1], books: of('new_testament') }
    ]
  }
}

/** The verses of a chapter from its HTML: a verse begins at its mark; the tags and the numbers go */
export function versesOfChapter(html: string): string[] {
  const verses: string[] = []
  const parts = html.split(/<span class="yv-v" v="(\d+)"><\/span>/)
  // parts: [before the first verse, number, text, number, text, …]
  for (let index = 1; index < parts.length; index += 2) {
    const number = Number(parts[index])
    const text = parts[index + 1]!.replace(/<span class="yv-vlbl">[^<]*<\/span>/g, '')
      .replace(/<\/div>\s*<div[^>]*>/g, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
    // a verse split by the marks of the lines of a poem is one verse
    verses[number - 1] = verses[number - 1] ? `${verses[number - 1]} ${text}` : text
  }
  return Array.from(verses, (verse) => verse ?? '')
}

export async function remoteChapter(
  id: number,
  code: string,
  chapter: number,
  key: string,
  fetcher: typeof fetch
): Promise<string[]> {
  const { content } = await api<{ content: string }>(
    `${id}/passages/${code}.${chapter + 1}?format=html`,
    key,
    fetcher
  )
  return versesOfChapter(content)
}

/** An answer kept a day in the cache of Cloudflare (none in the tests) */
export async function cached(request: Request, make: () => Promise<Response>): Promise<Response> {
  const cache = typeof caches === 'undefined' ? null : (caches as unknown as { default: Cache }).default
  const key = new Request(new URL(request.url).toString(), { method: 'GET' })
  const hit = await cache?.match(key)
  if (hit) return hit
  const response = await make()
  if (response.ok && cache) {
    const copy = new Response(response.clone().body, response)
    copy.headers.set('Cache-Control', `public, max-age=${DAY}`)
    await cache.put(key, copy)
  }
  return response
}
