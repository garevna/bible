import type { UsersStore } from './users'

/**
 * The duties of a leader of a ministry handed over to a deputy: the leader (or an administrator, when
 * the leader cannot) asks a deputy, and nothing changes until the deputy accepts; then the deputy leads
 * the ministry too and gets what would go to the leader. The leader, the deputy or an administrator
 * ends it; a handover with a last day ends by itself after it.
 *   { 'Канал ХХЦ': { fromUid, toUid, byUid, until: '2026-11-01' | null, status: 'pending' | 'accepted', at } }
 */
export interface Handover {
  /** the leader whose duties they are */
  fromUid: string
  /** the deputy who takes them */
  toUid: string
  /** who asked: the leader, or an administrator for the leader */
  byUid: string
  /** the last day ('YYYY-MM-DD'), or null until it is ended */
  until: string | null
  status: 'pending' | 'accepted'
  at: number
}

export type Handovers = Record<string, Handover>

const KEY = 'settings:handovers'

/** the handovers of the ministries; the ones past their last day are gone */
export async function getHandovers(store: UsersStore, today: string): Promise<Handovers> {
  const kept = (await store.get<Handovers>(KEY, 'json')) ?? {}
  return Object.fromEntries(
    Object.entries(kept).filter(([, handover]) => !handover.until || handover.until >= today)
  )
}

export const setHandovers = (store: UsersStore, handovers: Handovers) =>
  store.put(KEY, JSON.stringify(handovers))

/** the ministry got another name: its handover goes with it */
export function renameHandover(handovers: Handovers, from: string, to: string): Handovers {
  const { [from]: moved, ...rest } = handovers
  return moved ? { ...rest, [to]: moved } : handovers
}

/** '2026-11-01' or nothing: the last day of a handover, not in the past */
export function parseUntil(value: unknown, today: string): string | null | false {
  if (value === undefined || value === null || value === '') return null
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= today ? value : false
}
