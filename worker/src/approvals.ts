import type { UsersStore } from './users'

/**
 * A pastor away: the materials of the services they approve go to the pastors who stand in for them
 * (one or several; any of them approves), until the pastor ends it or its last day is past.
 *   { 'pastor-uid': { toUids: ['other-pastor-uid'], until: '2026-11-20' | null, at } }
 */
export interface ApprovalForward {
  toUids: string[]
  /** the last day ('YYYY-MM-DD'), or null until the pastor ends it */
  until: string | null
  at: number
}

export type ApprovalForwards = Record<string, ApprovalForward>

const KEY = 'settings:approvalForwards'

/** the forwards of the pastors; the ones past their last day are gone */
export async function getForwards(store: UsersStore, today: string): Promise<ApprovalForwards> {
  const kept = (await store.get<ApprovalForwards>(KEY, 'json')) ?? {}
  return Object.fromEntries(
    Object.entries(kept).filter(([, forward]) => !forward.until || forward.until >= today)
  )
}

export const setForwards = (store: UsersStore, forwards: ApprovalForwards) =>
  store.put(KEY, JSON.stringify(forwards))

/** who gets the materials of an event to approve: its pastor, or the pastors standing in for them */
export const approversOf = (approverUid: string | null, forwards: ApprovalForwards) =>
  !approverUid ? [] : forwards[approverUid]?.toUids.length ? forwards[approverUid]!.toUids : [approverUid]

/** who may approve them: those, and the pastor of the event in any case */
export const reviewersOf = (approverUid: string | null, forwards: ApprovalForwards) =>
  approverUid ? [...new Set([approverUid, ...approversOf(approverUid, forwards)])] : []
