import { getLeaders, type Leaders, type UsersStore } from './users'

/**
 * The roles inside a ministry: each ministry has roles of its own ("Керівник", "Музикант",
 * "Публікатор" in the ministry of the posts of the channel…), and a role gives its people rights
 * there. The status of a user (supervisor, admin, servant, reader: see roles.ts) is the access to
 * the app; what a servant does in a ministry comes from their roles in it.
 *   { 'Музичне служіння': [{ id, name: 'Керівник', lead: true, …, uids: [uid, …] }, …] }
 */
export interface MinistryRole {
  /** 'r-…', kept when the role is renamed */
  id: string
  name: string
  /** leads the ministry: creates its events, invites, approves and gives the roles of the events */
  lead: boolean
  /** invites people to the events of the ministry */
  invite: boolean
  /** takes the applications to the events of the ministry */
  approve: boolean
  /** posts notes and topics to the Telegram channel */
  publish: boolean
  /** writes messages to the people of the ministry */
  send: boolean
  /** its people */
  uids: string[]
}

export type MinistryRoles = Record<string, MinistryRole[]>

/** what a user may do by their roles in the ministries */
export interface MinistryRights {
  /** the ministries the user leads */
  leads: string[]
  /** the ministries whose events the user invites to */
  invite: string[]
  /** the ministries whose applications the user takes */
  approve: string[]
  publish: boolean
  /** the ministries whose people the user writes to */
  send: string[]
}

const KEY = 'settings:ministryRoles'

/** the role of a new ministry, and the one the leaders of the old version get */
export const leaderRole = (uids: string[] = []): MinistryRole => ({
  id: 'r-lead',
  name: 'Керівник',
  lead: true,
  invite: true,
  approve: true,
  publish: false,
  send: true,
  uids
})

/** The roles of the ministries; the first time, the leaders of the old version become "Керівник" */
export async function getMinistryRoles(store: UsersStore): Promise<MinistryRoles> {
  const kept = await store.get<MinistryRoles>(KEY, 'json')
  if (kept) return kept
  const leaders = await getLeaders(store)
  return Object.fromEntries(Object.entries(leaders).map(([ministry, uids]) => [ministry, [leaderRole(uids)]]))
}

export const setMinistryRoles = (store: UsersStore, roles: MinistryRoles) =>
  store.put(KEY, JSON.stringify(roles))

/** the leaders of the ministries, as the schedule needs them: the people of the roles that lead */
export const leadersOf = (roles: MinistryRoles): Leaders =>
  Object.fromEntries(
    Object.entries(roles)
      .map(([ministry, list]) => [
        ministry,
        [...new Set(list.filter((role) => role.lead).flatMap((role) => role.uids))]
      ])
      .filter(([, uids]) => uids!.length)
  )

export function ministryRightsOf(roles: MinistryRoles, uid: string): MinistryRights {
  const rights: MinistryRights = { leads: [], invite: [], approve: [], publish: false, send: [] }
  for (const [ministry, list] of Object.entries(roles)) {
    const mine = list.filter((role) => role.uids.includes(uid))
    if (mine.some((role) => role.lead)) rights.leads.push(ministry)
    // a leader invites, approves and writes to the people of the ministry
    if (mine.some((role) => role.lead || role.invite)) rights.invite.push(ministry)
    if (mine.some((role) => role.lead || role.approve)) rights.approve.push(ministry)
    if (mine.some((role) => role.lead || role.send)) rights.send.push(ministry)
    if (mine.some((role) => role.publish)) rights.publish = true
  }
  return rights
}

/** the ministry got another name: its roles go with it */
export function renameMinistry(roles: MinistryRoles, from: string, to: string): MinistryRoles {
  const { [from]: moved, ...rest } = roles
  return moved ? { ...rest, [to]: moved } : roles
}

const isRole = (value: unknown): value is MinistryRole => {
  const role = value as MinistryRole
  return (
    Boolean(role) &&
    typeof role.id === 'string' &&
    /^r-[a-z0-9-]{1,40}$/.test(role.id) &&
    typeof role.name === 'string' &&
    role.name.trim().length > 0 &&
    role.name.length <= 60 &&
    ['lead', 'invite', 'approve', 'publish', 'send'].every(
      (key) => typeof role[key as keyof MinistryRole] === 'boolean'
    ) &&
    Array.isArray(role.uids) &&
    role.uids.length <= 100 &&
    role.uids.every((uid) => typeof uid === 'string' && uid.length <= 200)
  )
}

/** Up to twenty roles with distinct ids in each known ministry; null when it is not that */
export function parseMinistryRoles(value: unknown, ministries: string[]): MinistryRoles | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const roles: MinistryRoles = {}
  for (const [ministry, list] of Object.entries(value as Record<string, unknown>)) {
    if (!ministries.includes(ministry)) return null
    if (!Array.isArray(list) || list.length > 20 || !list.every(isRole)) return null
    const ids = list.map((role) => role.id)
    if (new Set(ids).size !== ids.length) return null
    roles[ministry] = list.map((role) => ({
      id: role.id,
      name: role.name.trim(),
      lead: role.lead,
      invite: role.invite,
      approve: role.approve,
      publish: role.publish,
      send: role.send,
      uids: [...new Set(role.uids)]
    }))
  }
  return roles
}
