import { describe, expect, it } from 'vitest'

import { daysOf, localDay, memorySchedule, parseEvent, type ScheduleEvent } from './schedule'

const event = (change: Partial<ScheduleEvent>): ScheduleEvent => ({
  id: 'e1',
  typeId: null,
  ministry: 'Молитовне служіння',
  title: '',
  description: '',
  location: '',
  day: null,
  weekdays: null,
  time: '06:45',
  until: null,
  needed: 1,
  times: null,
  slots: [],
  mode: 'invite',
  applicants: 'ministry',
  responsibleUid: 'u',
  responsibleName: 'U',
  deputyUid: null,
  deputyName: null,
  createdBy: 'u',
  createdAt: 0,
  ...change
})

describe('the days of an event', () => {
  it('the morning prayer: every day but Sunday', () => {
    // 2026-10-12 is a Monday
    expect(daysOf(event({ weekdays: [1, 2, 3, 4, 5, 6] }), '2026-10-12', '2026-10-19')).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-19'
    ])
  })

  it('a repeated event ends with its last day; a single one has one day', () => {
    expect(daysOf(event({ weekdays: [0], until: '2026-10-20' }), '2026-10-12', '2026-11-30')).toEqual([
      '2026-10-18'
    ])
    expect(daysOf(event({ day: '2026-10-20' }), '2026-10-12', '2026-10-31')).toEqual(['2026-10-20'])
    expect(daysOf(event({ day: '2026-10-20' }), '2026-10-21', '2026-10-31')).toEqual([])
  })

  it('"today" is the day in Kyiv', () => {
    // 23:30 UTC on the 12th is already the 13th in Kyiv
    expect(localDay(Date.parse('2026-10-12T23:30:00Z'))).toBe('2026-10-13')
  })
})

describe('the body of an event', () => {
  const base = { ministry: 'Служіння причастя', time: '10:00', responsibleUid: 'u' }

  it('single or repeated, not both and not none; a correct time', () => {
    expect(parseEvent({ ...base, day: '2026-10-20' })).toMatchObject({
      day: '2026-10-20',
      weekdays: null,
      needed: 1
    })
    expect(parseEvent({ ...base, weekdays: [6, 0, 6], until: '2026-12-31' })).toMatchObject({
      weekdays: [0, 6],
      until: '2026-12-31'
    })
    expect(parseEvent({ ...base, day: '2026-10-20', weekdays: [0] })).toBeNull()
    expect(parseEvent({ ...base })).toBeNull()
    expect(parseEvent({ ...base, day: '2026-10-20', time: '25:00' })).toBeNull()
    expect(parseEvent({ ...base, day: '2026-10-20', needed: 0 })).toBeNull()
  })
})

describe('the store keeps no past', () => {
  it('single events before today, ended repeated ones and the people of past days go', async () => {
    const store = memorySchedule()
    await store.putEvent(event({ id: 'past', day: '2026-10-10' }))
    await store.putEvent(event({ id: 'ended', weekdays: [1], until: '2026-10-11' }))
    await store.putEvent(event({ id: 'going', weekdays: [1] }))
    await store.putParticipant({
      eventId: 'going',
      day: '2026-10-05',
      uid: 'u',
      name: 'U',
      status: 'confirmed',
      backupUid: null,
      backupName: null,
      backupStatus: null,
      reason: null,
      role: null,
      updatedAt: 0
    })
    const material = {
      eventId: 'going',
      role: 'Пастор',
      uid: 'u',
      name: 'U',
      kind: 'note' as const,
      title: '',
      post: { title: '', items: [] },
      createdAt: 0
    }
    await store.putMaterial({ ...material, id: 'old', day: '2026-10-05' })
    await store.putMaterial({ ...material, id: 'coming', day: '2026-10-19' })
    await store.deletePast('2026-10-12')
    expect((await store.materials('2026-01-01', '2026-12-31')).map((item) => item.id)).toEqual(['coming'])
    expect((await store.events('2026-10-12', '2026-12-31')).map((item) => item.id)).toEqual(['going'])
    expect(await store.participants('2026-01-01', '2026-12-31')).toEqual([])
  })
})
