import type { Slot } from '@/stores/schedule'

/** the name of a role of an hour: '08:00–09:00' */
const HOUR = /^([01]\d|2[0-3]):([0-5]\d)–([01]\d|2[0-3]):([0-5]\d)$/

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const clock = (total: number) => {
  const value = ((total % 1440) + 1440) % 1440
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

/**
 * A marathon (e.g. of prayer): every hour from one time to another, each hour a role of its own with its
 * people. The same time twice is a whole day; past midnight goes on to the next morning.
 */
export function hourlySlots(from: string, to: string, perHour: number): Slot[] {
  if (!/^\d\d:\d\d$/.test(from) || !/^\d\d:\d\d$/.test(to)) return []
  const length = (minutes(to) - minutes(from) + 1440) % 1440 || 1440
  const count = Math.min(50, Math.max(1, Math.floor(perHour) || 1))
  const slots: Slot[] = []
  for (let start = 0; start < length; start += 60) {
    const end = Math.min(start + 60, length)
    slots.push({
      name: `${clock(minutes(from) + start)}–${clock(minutes(from) + end)}`,
      count,
      materials: false,
      kinds: [],
      hint: ''
    })
  }
  return slots
}

/** the roles are the hours of a marathon: its end and the people of an hour; null when they are not */
export function hourlyOf(slots: Slot[]): { to: string; perHour: number } | null {
  if (!slots.length || !slots.every((slot) => HOUR.test(slot.name))) return null
  return { to: slots.at(-1)!.name.slice(6), perHour: slots[0]!.count }
}
