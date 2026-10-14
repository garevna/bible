import { describe, expect, it } from 'vitest'

import { dayStateOf, issuesOf, monthGrid, type Participant, type ScheduleEvent } from './schedule'

const event = (change: Partial<ScheduleEvent> = {}): ScheduleEvent => ({
  id: 'e1',
  typeId: null,
  ministry: 'Пасторське служіння',
  title: '',
  description: '',
  location: '',
  day: '2026-10-18',
  weekdays: null,
  time: '11:00',
  until: null,
  needed: 2,
  slots: [],
  mode: 'invite',
  responsibleUid: 'p',
  responsibleName: 'P',
  deputyUid: null,
  deputyName: null,
  ...change
})

const member = (uid: string, change: Partial<Participant> = {}): Participant => ({
  eventId: 'e1',
  day: '2026-10-18',
  uid,
  name: uid,
  status: 'confirmed',
  backupUid: null,
  backupName: null,
  backupStatus: null,
  reason: null,
  role: null,
  ...change
})

describe('what is not settled at an event', () => {
  it('too few people confirmed: the invited ones do not count', () => {
    expect(issuesOf(event(), [member('a'), member('b', { status: 'invited' })], [])).toEqual(['people'])
    expect(issuesOf(event(), [member('a'), member('b')], [])).toEqual([])
  })

  it('roles not given, materials of a role not sent by its person', () => {
    const slots = [
      { name: 'Пастор', count: 1, materials: true, hint: '' },
      { name: 'Учасник', count: 1, materials: false, hint: '' }
    ]
    const team = [member('a', { role: 'Пастор' }), member('b')]
    expect(issuesOf(event({ slots }), team, [])).toEqual(['roles', 'materials'])
    const material = {
      id: 'm',
      eventId: 'e1',
      day: '2026-10-18',
      role: 'Пастор',
      uid: 'a',
      name: 'a',
      kind: 'note' as const,
      title: '',
      createdAt: 0
    }
    const given = [member('a', { role: 'Пастор' }), member('b', { role: 'Учасник' })]
    expect(issuesOf(event({ slots }), given, [material])).toEqual([])
    // the materials of somebody else (the responsible person) do not stand for the pastor's
    expect(issuesOf(event({ slots }), given, [{ ...material, uid: 'p' }])).toEqual(['materials'])
  })
})

describe('the colors of the days', () => {
  const settings = { redDays: 2, orangeDays: 5 }
  const open = [{ issues: ['people' as const] }]

  it('green when everything is settled; red, orange, amber as the day comes near', () => {
    expect(dayStateOf([{ issues: [] }], '2026-10-14', '2026-10-14', settings)).toBe('ready')
    expect(dayStateOf(open, '2026-10-14', '2026-10-14', settings)).toBe('red')
    expect(dayStateOf(open, '2026-10-15', '2026-10-14', settings)).toBe('red')
    expect(dayStateOf(open, '2026-10-16', '2026-10-14', settings)).toBe('orange')
    expect(dayStateOf(open, '2026-10-20', '2026-10-14', settings)).toBe('orange')
    expect(dayStateOf(open, '2026-10-21', '2026-10-14', settings)).toBe('amber')
  })

  it('one unsettled event colors the whole day', () => {
    expect(dayStateOf([{ issues: [] }, ...open], '2026-10-14', '2026-10-14', settings)).toBe('red')
  })
})

describe('the grid of a month', () => {
  it('from the Monday of the first week to the Sunday of the last', () => {
    const days = monthGrid('2026-10')
    expect(days[0]).toBe('2026-09-28')
    expect(days.at(-1)).toBe('2026-11-01')
    expect(days).toHaveLength(35)
  })
})
