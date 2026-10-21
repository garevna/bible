import type { UsersStore } from './users'

/**
 * The resources of a ministry: the kinds of materials prepared for an event, kept by the planners
 * of the schedule. Some are for the team (the plan, the notes of the sermon, the media), some are
 * given to the people who come (the leaflet, the programme of the meeting). A role of an event says
 * which kinds its people prepare; a material says which kind it is.
 */
export interface MaterialKind {
  /** 'k-plan', … */
  id: string
  name: string
  /** for the team of the event, or given to the people who come */
  group: 'team' | 'participants'
}

export const DEFAULT_MATERIAL_KINDS: MaterialKind[] = [
  { id: 'k-plan', name: 'План служіння', group: 'team' },
  { id: 'k-materials', name: 'Матеріали до служіння', group: 'team' },
  { id: 'k-media', name: 'Медіа-пакет служіння', group: 'team' },
  { id: 'k-sermon', name: 'Конспект проповіді (тези проповіді)', group: 'team' },
  { id: 'k-word', name: 'Слово (конспект Слова)', group: 'team' },
  { id: 'k-theses', name: 'Духовні тези', group: 'team' },
  { id: 'k-leaflet', name: 'Пам’ятка служіння (буклет)', group: 'participants' },
  { id: 'k-guide', name: 'Путівник по служінню (програма зустрічі)', group: 'participants' }
]

const KEY = 'settings:materialKinds'

export const getMaterialKinds = async (store: UsersStore) =>
  (await store.get<MaterialKind[]>(KEY, 'json')) ?? DEFAULT_MATERIAL_KINDS

export const setMaterialKinds = (store: UsersStore, kinds: MaterialKind[]) =>
  store.put(KEY, JSON.stringify(kinds))

/** Up to fifty kinds with distinct ids and names; null when it is not a list of them */
export function parseMaterialKinds(value: unknown): MaterialKind[] | null {
  if (!Array.isArray(value) || value.length > 50) return null
  const kinds: MaterialKind[] = []
  for (const item of value as Record<string, unknown>[]) {
    const id = typeof item?.id === 'string' && /^k-[a-z0-9-]{1,40}$/.test(item.id) ? item.id : null
    const name = typeof item?.name === 'string' ? item.name.trim() : ''
    const group = item?.group === 'participants' ? 'participants' : item?.group === 'team' ? 'team' : null
    if (!id || !name || name.length > 80 || !group) return null
    kinds.push({ id, name, group })
  }
  const unique = (values: string[]) => new Set(values).size === values.length
  return unique(kinds.map((kind) => kind.id)) && unique(kinds.map((kind) => kind.name.toLowerCase()))
    ? kinds
    : null
}

/** The title and the channel of a video of YouTube (its oEmbed: no key needed); null when it is not found */
export async function videoOf(
  url: string,
  fetcher: typeof fetch
): Promise<{ title: string; author: string } | null> {
  const response = await fetcher(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`)
  if (!response.ok) return null
  const answer = (await response.json().catch(() => null)) as {
    title?: unknown
    author_name?: unknown
  } | null
  return typeof answer?.title === 'string'
    ? { title: answer.title, author: typeof answer.author_name === 'string' ? answer.author_name : '' }
    : null
}

/** a video of YouTube: watch, short, live or youtu.be; the link is kept as it is given */
export const isYouTube = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length <= 300 &&
  /^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?(.+&)?v=|shorts\/|live\/)|youtu\.be\/)[\w-]{6,}/.test(value)
