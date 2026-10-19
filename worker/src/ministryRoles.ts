import type { Handovers } from './handovers'
import { getLeaders, type Leaders, type UsersStore } from './users'

/**
 * The roles inside a ministry: each ministry has roles of its own ("Лідер служіння", "Музикант",
 * "Публікатор" in the ministry of the posts of the channel…), and a role gives its people rights
 * there. The status of a user (supervisor, admin, servant, reader: see roles.ts) is the access to
 * the app; what a servant does in a ministry comes from their roles in it.
 * The leaders of a ministry (the roles that lead) and their deputies are given by the administrators;
 * the leaders give the other roles of their ministry. A leader hands the duties over to a deputy
 * (see handovers.ts): once the deputy accepts, the deputy leads too.
 *   { 'Музичне служіння': [{ id, name: 'Лідер служіння', lead: true, …, uids: [uid, …] }, …] }
 */
export interface MinistryRole {
  /** 'r-…', kept when the role is renamed */
  id: string
  name: string
  /** leads the ministry: creates its events, invites, approves and gives the roles of the events */
  lead: boolean
  /** a deputy of the leader: takes the duties over when the leader hands them over */
  deputy: boolean
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
  /** the ministries the user leads (or leads for the leader, a deputy who took the duties over) */
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
  name: 'Лідер служіння',
  lead: true,
  deputy: false,
  invite: true,
  approve: true,
  publish: false,
  send: true,
  uids
})

/** The roles of the ministries; the first time, the leaders of the old version become "Лідер служіння" */
export async function getMinistryRoles(store: UsersStore): Promise<MinistryRoles> {
  const kept = await store.get<MinistryRoles>(KEY, 'json')
  if (kept) return kept
  const leaders = await getLeaders(store)
  return Object.fromEntries(Object.entries(leaders).map(([ministry, uids]) => [ministry, [leaderRole(uids)]]))
}

export const setMinistryRoles = (store: UsersStore, roles: MinistryRoles) =>
  store.put(KEY, JSON.stringify(roles))

const peopleOf = (list: MinistryRole[] = [], take: (role: MinistryRole) => boolean) => [
  ...new Set(list.filter(take).flatMap((role) => role.uids))
]

/** the leaders of a ministry by their roles (not the deputy acting for them) */
export const roleLeadersOf = (roles: MinistryRoles, ministry: string) =>
  peopleOf(roles[ministry], (role) => role.lead)

/** the deputies of the leaders of a ministry */
export const deputiesOf = (roles: MinistryRoles, ministry: string) =>
  peopleOf(roles[ministry], (role) => role.deputy)

/** the deputy who took the duties of the ministry over */
const actingOf = (handovers: Handovers, ministry: string) =>
  handovers[ministry]?.status === 'accepted' ? handovers[ministry]!.toUid : null

/**
 * the leaders of the ministries, as the schedule needs them: the people of the roles that lead, and
 * the deputy who took the duties over
 */
export const leadersOf = (roles: MinistryRoles, handovers: Handovers = {}): Leaders =>
  Object.fromEntries(
    [...new Set([...Object.keys(roles), ...Object.keys(handovers)])]
      .map((ministry) => {
        const acting = actingOf(handovers, ministry)
        return [ministry, [...new Set([...roleLeadersOf(roles, ministry), ...(acting ? [acting] : [])])]]
      })
      .filter(([, uids]) => uids!.length)
  )

export function ministryRightsOf(
  roles: MinistryRoles,
  uid: string,
  handovers: Handovers = {}
): MinistryRights {
  const rights: MinistryRights = { leads: [], invite: [], approve: [], publish: false, send: [] }
  for (const [ministry, list] of Object.entries(roles)) {
    const mine = list.filter((role) => role.uids.includes(uid))
    // the deputy who took the duties over leads as the leader does
    const leads = mine.some((role) => role.lead) || actingOf(handovers, ministry) === uid
    if (leads) rights.leads.push(ministry)
    // a leader invites, approves and writes to the people of the ministry
    if (leads || mine.some((role) => role.invite)) rights.invite.push(ministry)
    if (leads || mine.some((role) => role.approve)) rights.approve.push(ministry)
    if (leads || mine.some((role) => role.send)) rights.send.push(ministry)
    if (mine.some((role) => role.publish)) rights.publish = true
  }
  return rights
}

/**
 * The roles of a ministry as its leader changes them: the roles of the leaders and of their deputies
 * stay as the administrators gave them, and no other role leads or deputizes
 */
export function byLeader(old: MinistryRole[], changed: MinistryRole[]): MinistryRole[] {
  const fixed = old.filter((role) => role.lead || role.deputy)
  return [
    ...fixed,
    ...changed
      .filter((role) => !fixed.some((item) => item.id === role.id))
      .map((role) => ({ ...role, lead: false, deputy: false }))
  ]
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
    // the roles saved before the deputies have none
    (role.deputy === undefined || typeof role.deputy === 'boolean') &&
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
      deputy: role.deputy ?? false,
      invite: role.invite,
      approve: role.approve,
      publish: role.publish,
      send: role.send,
      uids: [...new Set(role.uids)]
    }))
  }
  return roles
}
