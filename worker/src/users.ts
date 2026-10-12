import { isOwner, type AuthUser } from './auth'

/** reader: the app; publisher: also posts to Telegram; admin: also gives the roles */
export const ROLES = ['reader', 'publisher', 'admin'] as const
export type Role = (typeof ROLES)[number]

export const isRole = (value: unknown): value is Role => ROLES.includes(value as Role)

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
    name: short(user.name),
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

/** The owners are administrators whatever the record says */
export const roleOf = (record: UserRecord, owners: string): Role =>
  isOwner(record, owners) ? 'admin' : record.role

export const view = (record: UserRecord, owners: string): UserView => ({
  ...record,
  role: roleOf(record, owners),
  owner: isOwner(record, owners)
})

/** All users but the owners (they stay out of sight), the last seen first */
export async function listUsers(store: UsersStore, owners: string): Promise<UserView[]> {
  const users: UserView[] = []
  let cursor: string | undefined
  do {
    const page = await store.list<UserRecord>({ prefix: 'user:', cursor })
    page.keys.forEach(
      ({ metadata }) => metadata && !isOwner(metadata, owners) && users.push(view(metadata, owners))
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
  change: { role?: Role; ministries?: string[]; phone?: string | null },
  now = Date.now()
): Promise<UserView> {
  const record =
    uid === admin.uid && change.role === undefined ? admin : await changeable(store, owners, admin, uid)
  const updated: UserRecord = {
    ...record,
    ...(change.role ? { role: change.role } : {}),
    ...(change.ministries ? { ministries: change.ministries } : {}),
    ...(change.phone !== undefined ? { phone: change.phone ?? undefined } : {}),
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

/* ---------- ministries ---------- */

const MINISTRIES_KEY = 'settings:ministries'
export const DEFAULT_MINISTRIES = ['Лідер домашньої групи', 'Музичне служіння']

/** The ministries of the church (the administrators keep the list) */
export const getMinistries = async (store: UsersStore) =>
  (await store.get<string[]>(MINISTRIES_KEY, 'json')) ?? DEFAULT_MINISTRIES

/** A list of short distinct names, or null when it is not one */
export function parseMinistries(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 30) return null
  const names = value.map((item) => (typeof item === 'string' ? item.trim() : ''))
  if (names.some((name) => !name || name.length > 60)) return null
  return [...new Set(names)]
}

export const setMinistries = (store: UsersStore, ministries: string[]) =>
  store.put(MINISTRIES_KEY, JSON.stringify(ministries))
