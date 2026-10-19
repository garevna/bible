import type { UsersStore } from './users'

/**
 * The home groups of the church: each meets once a week at its place, and has a leader. The
 * administrators create a group and give it its leader; the leader keeps the rest: the day and the
 * time, the place on the map, a few words about the group, its members and the notes for the next
 * meeting. The people who may see the groups (all the servants, or the administrators only: a setting)
 * see the day, the place, the leader and the names of the members; the birthdays and the notes about
 * the members, and the notes for the meeting, are for the leader of the group and the supervisors.
 */
export interface GroupMember {
  id: string
  name: string
  /** 'YYYY-MM-DD', or '--MM-DD' when the year is not known; for the greetings */
  birthday: string | null
  /** e.g. needs help, moved from another city, does not walk far */
  note: string
}

export interface HomeGroup {
  id: string
  name: string
  leaderUid: string
  /** the place where the group meets, and its point on the map when it was chosen there */
  address: string
  lat?: number
  lng?: number
  /** 0 Sunday … 6 Saturday; null while not set */
  weekday: number | null
  /** 'HH:MM' */
  time: string
  description: string
  members: GroupMember[]
  /** the notes of the leader for the next meeting */
  meetingNote: string
}

/** who sees the groups besides their leaders and the supervisors */
export type GroupsVisibility = 'servants' | 'admins'

const GROUPS_KEY = 'settings:homeGroups'
const VISIBILITY_KEY = 'settings:homeGroupsVisibility'

export const getGroups = async (store: UsersStore) => (await store.get<HomeGroup[]>(GROUPS_KEY, 'json')) ?? []

export const setGroups = (store: UsersStore, groups: HomeGroup[]) =>
  store.put(GROUPS_KEY, JSON.stringify(groups))

export const getGroupsVisibility = async (store: UsersStore): Promise<GroupsVisibility> =>
  (await store.get(VISIBILITY_KEY)) === 'admins' ? 'admins' : 'servants'

export const setGroupsVisibility = (store: UsersStore, visibility: GroupsVisibility) =>
  store.put(VISIBILITY_KEY, visibility)

/** a group as others see it: the birthdays and the notes stay with its leader */
export const publicGroup = (group: HomeGroup): HomeGroup => ({
  ...group,
  members: group.members.map((member) => ({ ...member, birthday: null, note: '' })),
  meetingNote: ''
})

const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.length <= max ? value.trim() : null

const isTime = (value: unknown) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
const isBirthday = (value: unknown) =>
  typeof value === 'string' && /^(\d{4}-|--)(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)

function parseMembers(value: unknown): GroupMember[] | null {
  if (!Array.isArray(value) || value.length > 200) return null
  const members: GroupMember[] = []
  for (const item of value as Record<string, unknown>[]) {
    const name = text(item?.name, 120)
    const note = item?.note === undefined ? '' : text(item.note, 1000)
    const id = text(item?.id, 40)
    if (!name || note === null || !id) return null
    if (item.birthday !== null && item.birthday !== undefined && !isBirthday(item.birthday)) return null
    members.push({ id, name, birthday: (item.birthday as string | null | undefined) ?? null, note })
  }
  return members
}

/** what the leader of a group changes; null when it is not that */
export function parseLeaderChange(
  value: unknown
): Partial<Omit<HomeGroup, 'id' | 'name' | 'leaderUid'>> | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  const change: Partial<HomeGroup> = {}
  if (body.address !== undefined) {
    const address = text(body.address, 200)
    if (address === null) return null
    change.address = address
  }
  if (body.lat !== undefined || body.lng !== undefined) {
    const point = [body.lat, body.lng]
    if (point.every((item) => item === null)) {
      change.lat = undefined
      change.lng = undefined
    } else if (
      typeof body.lat === 'number' &&
      typeof body.lng === 'number' &&
      Math.abs(body.lat) <= 90 &&
      Math.abs(body.lng) <= 180
    ) {
      change.lat = body.lat
      change.lng = body.lng
    } else return null
  }
  if (body.weekday !== undefined) {
    if (
      body.weekday !== null &&
      !(Number.isInteger(body.weekday) && (body.weekday as number) >= 0 && (body.weekday as number) <= 6)
    )
      return null
    change.weekday = body.weekday as number | null
  }
  if (body.time !== undefined) {
    if (body.time !== '' && !isTime(body.time)) return null
    change.time = body.time as string
  }
  if (body.description !== undefined) {
    const description = text(body.description, 2000)
    if (description === null) return null
    change.description = description
  }
  if (body.members !== undefined) {
    const members = parseMembers(body.members)
    if (!members) return null
    change.members = members
  }
  if (body.meetingNote !== undefined) {
    const note = text(body.meetingNote, 5000)
    if (note === null) return null
    change.meetingNote = note
  }
  return change
}

/** the name and the leader of a group, as the administrators give them; null when it is not that */
export function parseGroupHead(value: unknown): { name?: string; leaderUid?: string } | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  const head: { name?: string; leaderUid?: string } = {}
  if (body.name !== undefined) {
    const name = text(body.name, 80)
    if (!name) return null
    head.name = name
  }
  if (body.leaderUid !== undefined) {
    const uid = text(body.leaderUid, 200)
    if (!uid) return null
    head.leaderUid = uid
  }
  return head
}

export const newGroup = (name: string, leaderUid: string): HomeGroup => ({
  id: `g-${crypto.randomUUID().slice(0, 8)}`,
  name,
  leaderUid,
  address: '',
  weekday: null,
  time: '',
  description: '',
  members: [],
  meetingNote: ''
})
