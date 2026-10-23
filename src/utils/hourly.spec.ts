import { describe, expect, it } from 'vitest'

import { hourlyOf, hourlySlots } from '@/utils/hourly'

describe('hourly', () => {
  it('every hour a role of its own; the last one may be shorter', () => {
    expect(hourlySlots('08:00', '11:30', 2).map((slot) => [slot.name, slot.count])).toEqual([
      ['08:00–09:00', 2],
      ['09:00–10:00', 2],
      ['10:00–11:00', 2],
      ['11:00–11:30', 2]
    ])
  })

  it('past midnight to the morning; the same time twice is a whole day', () => {
    expect(hourlySlots('22:00', '01:00', 1).map((slot) => slot.name)).toEqual([
      '22:00–23:00',
      '23:00–00:00',
      '00:00–01:00'
    ])
    expect(hourlySlots('06:00', '06:00', 1)).toHaveLength(24)
  })

  it('the roles of hours tell the end and the people of an hour; other roles do not', () => {
    expect(hourlyOf(hourlySlots('20:00', '23:00', 3))).toEqual({ to: '23:00', perHour: 3 })
    expect(hourlyOf([{ name: 'Ведучий', count: 1, materials: false, kinds: [], hint: '' }])).toBeNull()
    expect(hourlyOf([])).toBeNull()
  })
})
