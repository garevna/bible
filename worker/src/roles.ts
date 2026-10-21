import type { MinistryRights } from './ministryRoles'
import type { UsersStore } from './users'

/** The functions of administrators: each is given to a role on its own */
export const MANAGE = ['roles', 'users', 'directories', 'types', 'schedule'] as const
export type Manage = (typeof MANAGE)[number]

/**
 * A status, kept by the administrators: the access to the app and what its people may do everywhere.
 * There are four of them, built in: the supervisor (every right), the administrator, the servant and
 * the reader (everyone who signed in: no rights). What a servant does in a ministry comes from their
 * roles there (see ministryRoles.ts). The type keeps its old name: the statuses were the roles once.
 */
export interface RoleDef {
  /** 'admin', 'publisher', … */
  id: string
  name: string
  /** posts notes and topics to the Telegram channel */
  publish: boolean
  /** writes messages to colleagues */
  send: boolean
  /** the roles whose people it may write to */
  sendToRoles: string[]
  /** it may write to anyone it chooses, whatever their role */
  sendToPeople: boolean
  /** days the messages it sends are kept */
  messageDays: number
  /** approves the people who applied for a ministry of the calendar, and gives them their roles there */
  approve: boolean
  /** the ministries whose events it invites people to; ANY_MINISTRY: every ministry */
  invite: string[]
  /** the functions of an administrator it has */
  manage: Manage[]
}

export const READER = 'reader'
export const SUPERVISOR = 'supervisor'

/** the statuses, the highest first */
export const STATUSES = [SUPERVISOR, 'admin', 'servant', READER] as const

/**
 * The status of a role id: the roles of the old version that are no statuses (e.g. 'publisher')
 * serve; the owners keep 'owner' (the rights of the supervisor, whatever the list says)
 */
export const statusOf = (id: string) =>
  id === 'owner' || (STATUSES as readonly string[]).includes(id) || isCustom(id) ? id : 'servant'

/** a status added by a supervisor: 'status-…' */
export const isCustom = (id: string) => id.startsWith('status-')

/** in the ministries a role invites to: every ministry */
export const ANY_MINISTRY = '*'

export const DEFAULT_ROLES: RoleDef[] = [
  {
    id: READER,
    name: 'Читач',
    publish: false,
    send: false,
    sendToRoles: [],
    sendToPeople: false,
    messageDays: 1,
    approve: false,
    invite: [],
    manage: []
  },
  {
    id: 'servant',
    name: 'Служитель',
    publish: false,
    send: false,
    sendToRoles: [],
    sendToPeople: false,
    messageDays: 1,
    approve: false,
    invite: [],
    manage: []
  },
  {
    id: 'admin',
    name: 'Адміністратор',
    publish: true,
    send: true,
    sendToRoles: ['servant', 'admin', SUPERVISOR],
    sendToPeople: true,
    messageDays: 1,
    approve: true,
    invite: [ANY_MINISTRY],
    manage: [...MANAGE]
  },
  {
    id: SUPERVISOR,
    name: 'Супервайзер',
    publish: true,
    send: true,
    sendToRoles: ['servant', 'admin', SUPERVISOR],
    sendToPeople: true,
    messageDays: 7,
    approve: true,
    invite: [ANY_MINISTRY],
    manage: [...MANAGE]
  }
]

const defaultOf = (id: string) => DEFAULT_ROLES.find((role) => role.id === id)!

/** the owners: every right of the supervisor, whatever the list of statuses says */
export const OWNER_ROLE: RoleDef = { ...defaultOf(SUPERVISOR), id: 'owner', name: 'Власник' }

/** what a user may do: their status, and their roles in the ministries */
export interface Rights extends RoleDef {
  /** the ministries whose applications the user takes (the status may approve everywhere) */
  approveIn: string[]
  /** the ministries whose people the user writes to (besides the statuses the status writes to) */
  sendToMinistries: string[]
}

export function effectiveRights(status: RoleDef, ministry: MinistryRights): Rights {
  return {
    ...status,
    publish: status.publish || ministry.publish,
    send: status.send || ministry.send.length > 0,
    invite: status.invite.includes(ANY_MINISTRY)
      ? [ANY_MINISTRY]
      : [...new Set([...status.invite, ...ministry.invite])],
    approveIn: ministry.approve,
    sendToMinistries: ministry.send
  }
}

/** The four statuses: the reader has no rights, the supervisor has all of them */
function statusesOf(list: RoleDef[]): RoleDef[] {
  const builtIn = STATUSES.map((id) => {
    // the supervisor of the old version was a role of its own, known by its name
    const kept =
      list.find((role) => role.id === id) ??
      (id === SUPERVISOR ? list.find((role) => role.name.trim() === 'Супервайзер') : undefined)
    const name = kept?.name ?? defaultOf(id).name
    if (id === SUPERVISOR || id === READER) return { ...defaultOf(id), name }
    return kept
      ? { ...kept, id, sendToRoles: kept.sendToRoles.filter((item) => item !== 'publisher') }
      : defaultOf(id)
  })
  // the statuses added by the supervisors: between the administrator and the servant
  const custom = list.filter((role) => isCustom(role.id))
  return [builtIn[0]!, builtIn[1]!, ...custom, builtIn[2]!, builtIn[3]!]
}

const ROLES_KEY = 'settings:roles'

export async function getRoles(store: UsersStore): Promise<RoleDef[]> {
  const kept = await store.get<RoleDef[]>(ROLES_KEY, 'json')
  if (!kept) return statusesOf(DEFAULT_ROLES)
  // roles saved before approving was a right of its own: the planners of the schedule approve
  const saved = kept.map((role) => ({
    ...role,
    approve: role.approve ?? role.manage.includes('schedule'),
    // the publishers (pastors) and the planners invited to every ministry before it was a right
    invite: role.invite ?? (role.publish || role.manage.includes('schedule') ? [ANY_MINISTRY] : [])
  }))
  return statusesOf(saved)
}

export const setRoles = (store: UsersStore, roles: RoleDef[]) => store.put(ROLES_KEY, JSON.stringify(roles))

/** The status of a role id (see statusOf) */
export const roleDefOf = (roles: RoleDef[], id: string): RoleDef =>
  roles.find((role) => role.id === statusOf(id)) ??
  // a status removed by a supervisor: its people serve
  (isCustom(id) ? roles.find((role) => role.id === 'servant') : undefined) ??
  defaultOf(READER)

const isRoleDef = (value: unknown): value is RoleDef => {
  const role = value as RoleDef
  return (
    Boolean(role) &&
    typeof role.id === 'string' &&
    /^[a-z0-9-]{1,40}$/.test(role.id) &&
    role.id !== 'owner' &&
    typeof role.name === 'string' &&
    role.name.trim().length > 0 &&
    role.name.length <= 60 &&
    typeof role.publish === 'boolean' &&
    typeof role.send === 'boolean' &&
    Array.isArray(role.sendToRoles) &&
    role.sendToRoles.every((id) => typeof id === 'string') &&
    typeof role.sendToPeople === 'boolean' &&
    Number.isInteger(role.messageDays) &&
    role.messageDays >= 1 &&
    role.messageDays <= 30 &&
    (role.approve === undefined || typeof role.approve === 'boolean') &&
    (role.invite === undefined ||
      (Array.isArray(role.invite) &&
        role.invite.length <= 100 &&
        role.invite.every((item) => typeof item === 'string' && item.length <= 60))) &&
    Array.isArray(role.manage) &&
    role.manage.every((item) => MANAGE.includes(item))
  )
}

/**
 * The four statuses and the ones added by the supervisors ('status-…'; others are left out); the reader
 * stays without rights, the supervisor with all. Null when it is not a list of them
 */
export function parseRoles(value: unknown): RoleDef[] | null {
  if (!Array.isArray(value) || value.length > 30 || !value.every(isRoleDef)) return null
  const ids = value.map((role) => role.id)
  if (new Set(ids).size !== ids.length) return null
  const roles = value.map((role) => ({
    id: role.id,
    name: role.name.trim(),
    publish: role.publish,
    send: role.send,
    // only the roles of the list
    sendToRoles: [...new Set(role.sendToRoles)].filter((id) => ids.includes(id) && id !== READER),
    sendToPeople: role.sendToPeople,
    messageDays: role.messageDays,
    approve: role.approve ?? false,
    // every ministry, or the chosen ones
    invite: role.invite?.includes(ANY_MINISTRY) ? [ANY_MINISTRY] : [...new Set(role.invite ?? [])],
    manage: [...new Set(role.manage)]
  }))
  return statusesOf(roles)
}
