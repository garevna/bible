import { isOwner, type AuthUser } from './auth'

/** the id of a role of the list kept by the administrators (see roles.ts); 'owner' for the owners */
export type Role = string

/** A user who signed in to the app at least once */
export interface UserRecord {
  uid: string
  email: string | null
  emailVerified: boolean
  name: string | null
  role: Role
  /** the ministries the user serves in (e.g. 'Музичне служіння'), given by an administrator */
  ministries?: string[]
  /** the mobile number, '+380501234567' (ministers need one) */
  phone?: string
  /** the name was given by an administrator: signing in keeps it (not the name of the account) */
  nameSet?: boolean
  /** the private chat with the service bot, once the user linked Telegram */
  telegramChatId?: number
  /** ms */
  lastSeen: number
  /** who gave the role and when */
  updatedBy?: string
  updatedAt?: number
}

/** The record as the dashboard shows it */
export type UserView = UserRecord & { owner: boolean }

export type UsersStore = Pick<KVNamespace, 'get' | 'put' | 'list' | 'delete'>

const key = (uid: string) => `user:${uid}`

/** a seen user is written again after this time, to keep the writes of the free plan low */
const SEEN_EVERY = 12 * 60 * 60 * 1000

const short = (value: string | null) => (value ? value.slice(0, 200) : null)

// the whole record is the metadata of the key too, so the list needs no reads (KV: up to 1024 bytes)
const save = (store: UsersStore, record: UserRecord) =>
  store.put(key(record.uid), JSON.stringify(record), { metadata: record })

export const getUser = async (store: UsersStore, uid: string) =>
  (await store.get<UserRecord>(key(uid), 'json')) ?? null

/** Remembers the user who called the worker; returns the record */
export async function touchUser(store: UsersStore, user: AuthUser, now = Date.now()): Promise<UserRecord> {
  const old = await getUser(store, user.uid)
  const record: UserRecord = {
    role: 'reader',
    ...old,
    uid: user.uid,
    email: short(user.email),
    emailVerified: user.emailVerified,
    // the name an administrator gave stays
    name: old?.nameSet ? old.name : short(user.name),
    lastSeen: old && now - old.lastSeen < SEEN_EVERY ? old.lastSeen : now
  }
  const changed =
    !old ||
    old.lastSeen !== record.lastSeen ||
    old.email !== record.email ||
    old.name !== record.name ||
    old.emailVerified !== record.emailVerified
  changed && (await save(store, record))
  return record
}

/**
 * The owners have every right whatever the record says. A reader with ministries (as the members of
 * ministries were kept before the roles) is a servant.
 */
export function roleOf(record: UserRecord, owners: string): Role {
  if (isOwner(record, owners)) return 'owner'
  return record.role === 'reader' && record.ministries?.length ? 'servant' : record.role
}

export const view = (record: UserRecord, owners: string): UserView => ({
  ...record,
  role: roleOf(record, owners),
  owner: isOwner(record, owners)
})

/** All users but the owners (they stay out of the dashboard; the calendar has them too), the last seen first */
export async function listUsers(store: UsersStore, owners: string, withOwners = false): Promise<UserView[]> {
  const users: UserView[] = []
  let cursor: string | undefined
  do {
    const page = await store.list<UserRecord>({ prefix: 'user:', cursor })
    page.keys.forEach(
      ({ metadata }) =>
        metadata && (withOwners || !isOwner(metadata, owners)) && users.push(view(metadata, owners))
    )
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  return users.sort((a, b) => b.lastSeen - a.lastSeen)
}

export class RoleChangeError extends Error {
  constructor(readonly code: 'not-found' | 'owner' | 'self') {
    super(code)
  }
}

async function changeable(store: UsersStore, owners: string, admin: UserRecord, uid: string) {
  if (uid === admin.uid) throw new RoleChangeError('self')
  const record = await getUser(store, uid)
  if (!record) throw new RoleChangeError('not-found')
  if (isOwner(record, owners)) throw new RoleChangeError('owner')
  return record
}

/** Takes a user off the list (e.g. a temporary admin); signed in again, they come back as a reader */
export async function removeUser(store: UsersStore, owners: string, admin: UserRecord, uid: string) {
  await changeable(store, owners, admin, uid)
  await store.delete(key(uid))
}

/**
 * Gives a role, ministries and/or a phone number. Owners are not changed; an administrator may put themselves
 * into ministries, but not change their own role (nobody locks themselves out).
 */
export async function updateUser(
  store: UsersStore,
  owners: string,
  admin: UserRecord,
  uid: string,
  change: { role?: Role; ministries?: string[]; phone?: string | null; name?: string | null },
  now = Date.now()
): Promise<UserView> {
  const record =
    uid === admin.uid && change.role === undefined ? admin : await changeable(store, owners, admin, uid)
  const updated: UserRecord = {
    ...record,
    ...(change.role ? { role: change.role } : {}),
    ...(change.ministries ? { ministries: change.ministries } : {}),
    ...(change.phone !== undefined ? { phone: change.phone ?? undefined } : {}),
    // a name of the administrators, or (null) the name of the account again, from the next sign in
    ...(change.name !== undefined ? { name: change.name ?? record.name, nameSet: Boolean(change.name) } : {}),
    updatedBy: admin.name ?? admin.email ?? admin.uid,
    updatedAt: now
  }
  await save(store, updated)
  return view(updated, owners)
}

/* ---------- phone numbers ---------- */

/** '+380501234567' (E.164); the app checks the number with libphonenumber-js, the worker its form */
export const isPhone = (value: unknown): value is string =>
  typeof value === 'string' && /^\+[1-9]\d{7,14}$/.test(value)

/** The user sets their own number (or takes it away with null) */
export async function setOwnPhone(
  store: UsersStore,
  me: UserRecord,
  phone: string | null
): Promise<UserRecord> {
  const { phone: _old, ...rest } = me
  const updated: UserRecord = phone ? { ...rest, phone } : rest
  await save(store, updated)
  return updated
}

/**
 * The leaders of the ministries: { 'Молитовне служіння': [uid, …] }. A leader plans the events of the
 * ministry: creates them, invites, calls for applications, approves and gives the roles there.
 */
export type Leaders = Record<string, string[]>

const LEADERS_KEY = 'settings:leaders'

export const getLeaders = async (store: UsersStore) => (await store.get<Leaders>(LEADERS_KEY, 'json')) ?? {}

export const setLeaders = (store: UsersStore, leaders: Leaders) =>
  store.put(LEADERS_KEY, JSON.stringify(leaders))

/** { ministry: [uid, …] } of known ministries, each with up to twenty leaders; null when it is not that */
export function parseLeaders(value: unknown, ministries: string[]): Leaders | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const leaders: Leaders = {}
  for (const [ministry, uids] of Object.entries(value as Record<string, unknown>)) {
    if (!ministries.includes(ministry)) return null
    if (
      !Array.isArray(uids) ||
      uids.length > 20 ||
      !uids.every((uid) => typeof uid === 'string' && uid.length <= 200)
    )
      return null
    if (uids.length) leaders[ministry] = [...new Set(uids as string[])]
  }
  return leaders
}

/** The place of a location: its address, and the point on the map when it was chosen there */
export interface Place {
  address: string
  lat?: number
  lng?: number
}

/** The places of the locations: { 'Церква': { address: 'Харків, вул. …', lat, lng } }; none: online */
export type Addresses = Record<string, Place>

const ADDRESSES_KEY = 'settings:addresses'

/** the places; an address kept as a plain text (before the points on the map) is a place too */
export async function getAddresses(store: UsersStore): Promise<Addresses> {
  const kept = (await store.get<Record<string, Place | string>>(ADDRESSES_KEY, 'json')) ?? {}
  return Object.fromEntries(
    Object.entries(kept).map(([location, place]) => [
      location,
      typeof place === 'string' ? { address: place } : place
    ])
  )
}

export const setAddresses = (store: UsersStore, addresses: Addresses) =>
  store.put(ADDRESSES_KEY, JSON.stringify(addresses))

const isCoordinate = (value: unknown, limit: number) =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit

/**
 * { location: place } of known locations: an address of up to 200 letters (empty: none) and the point
 * on the map, both coordinates or none; a plain text is an address. Null when it is not that
 */
export function parseAddresses(value: unknown, locations: string[]): Addresses | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const addresses: Addresses = {}
  for (const [location, item] of Object.entries(value as Record<string, unknown>)) {
    const place = (typeof item === 'string' ? { address: item } : item) as Record<string, unknown> | null
    if (
      !locations.includes(location) ||
      !place ||
      typeof place.address !== 'string' ||
      place.address.length > 200
    )
      return null
    const point = place.lat !== undefined || place.lng !== undefined
    if (point && (!isCoordinate(place.lat, 90) || !isCoordinate(place.lng, 180))) return null
    const address = place.address.trim()
    if (address)
      addresses[location] = point
        ? { address, lat: place.lat as number, lng: place.lng as number }
        : { address }
  }
  return addresses
}

/** The user's chat with the service bot (null: unlinked) */
export async function setTelegramChat(store: UsersStore, record: UserRecord, chatId: number | null) {
  const { telegramChatId: _old, ...rest } = record
  const updated: UserRecord = chatId ? { ...rest, telegramChatId: chatId } : rest
  await save(store, updated)
  return updated
}

/* ---------- directories: the ministries and the locations of the church ---------- */

export const DIRECTORIES = ['ministries', 'locations'] as const
export type Directory = (typeof DIRECTORIES)[number]

const DEFAULT_DIRECTORIES: Record<Directory, string[]> = {
  ministries: [
    'Музичне служіння',
    'Дитяче служіння',
    'Молитовне служіння',
    'Служіння порядку',
    'Господарське служіння',
    'Пасторське служіння',
    'Служіння причастя',
    'Лідер домашньої групи'
  ],
  locations: ['Церква', 'Онлайн']
}

/** A list kept by the administrators */
export const getDirectory = async (store: UsersStore, name: Directory) =>
  (await store.get<string[]>(`settings:${name}`, 'json')) ?? DEFAULT_DIRECTORIES[name]

export const setDirectory = (store: UsersStore, name: Directory, items: string[]) =>
  store.put(`settings:${name}`, JSON.stringify(items))

export const getMinistries = (store: UsersStore) => getDirectory(store, 'ministries')

/** A list of short distinct names, or null when it is not one */
export function parseMinistries(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 50) return null
  const names = value.map((item) => (typeof item === 'string' ? item.trim() : ''))
  if (names.some((name) => !name || name.length > 60)) return null
  return [...new Set(names)]
}
