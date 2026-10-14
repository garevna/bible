import type { UsersStore } from './users'

/** The functions of administrators: each is given to a role on its own */
export const MANAGE = ['roles', 'users', 'directories', 'types', 'schedule'] as const
export type Manage = (typeof MANAGE)[number]

/**
 * A role, kept by the administrators: what its people may do.
 * The reader (everyone who signed in) is built in: no rights, cannot be removed.
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
    id: 'publisher',
    name: 'Публікатор',
    publish: true,
    send: true,
    sendToRoles: ['servant', 'publisher', 'admin'],
    sendToPeople: true,
    messageDays: 1,
    approve: true,
    invite: [ANY_MINISTRY],
    manage: []
  },
  {
    id: 'admin',
    name: 'Адміністратор',
    publish: true,
    send: true,
    sendToRoles: ['servant', 'publisher', 'admin'],
    sendToPeople: true,
    messageDays: 1,
    approve: true,
    invite: [ANY_MINISTRY],
    manage: [...MANAGE]
  }
]

/** the owners: every right, whatever the list of roles says */
export const OWNER_ROLE: RoleDef = { ...DEFAULT_ROLES[3]!, id: 'owner', name: 'Власник' }

const ROLES_KEY = 'settings:roles'

export async function getRoles(store: UsersStore): Promise<RoleDef[]> {
  const kept = await store.get<RoleDef[]>(ROLES_KEY, 'json')
  if (!kept) return DEFAULT_ROLES
  // roles saved before approving was a right of its own: the planners of the schedule approve
  const saved = kept.map((role) => ({
    ...role,
    approve: role.approve ?? role.manage.includes('schedule'),
    // the publishers (pastors) and the planners invited to every ministry before it was a right
    invite: role.invite ?? (role.publish || role.manage.includes('schedule') ? [ANY_MINISTRY] : [])
  }))
  // the reader is always there and has no rights
  return saved.some((role) => role.id === READER) ? saved : [DEFAULT_ROLES[0]!, ...saved]
}

export const setRoles = (store: UsersStore, roles: RoleDef[]) => store.put(ROLES_KEY, JSON.stringify(roles))

/** The role of a role id; an unknown or removed role counts as the reader */
export const roleDefOf = (roles: RoleDef[], id: string): RoleDef =>
  roles.find((role) => role.id === id) ?? roles.find((role) => role.id === READER) ?? DEFAULT_ROLES[0]!

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

/** Up to thirty roles with distinct ids; the reader stays without rights. Null when it is not a list of roles */
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
  const reader = roles.find((role) => role.id === READER)
  const fixedReader = { ...DEFAULT_ROLES[0]!, name: reader?.name ?? DEFAULT_ROLES[0]!.name }
  return [fixedReader, ...roles.filter((role) => role.id !== READER)]
}
