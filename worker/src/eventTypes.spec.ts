import { describe, expect, it } from 'vitest'

import { DEFAULT_EVENT_TYPES, parseCalendar, parseEventTypes, parseSlots } from './eventTypes'

describe('the types of events', () => {
  it('the defaults are valid', () => {
    expect(parseEventTypes(DEFAULT_EVENT_TYPES)).toEqual(DEFAULT_EVENT_TYPES)
  })

  it('a type of fixed roles needs roles; a type without roles keeps none', () => {
    const type = { id: 'communion', name: 'Причастя', ministry: null, roles: 'fixed', slots: [] }
    expect(parseEventTypes([type])).toBeNull()
    const slots = [{ name: 'Пастор', count: 1, materials: true, hint: 'Нотатки' }]
    expect(parseEventTypes([{ ...type, roles: 'none', slots }])).toEqual([
      { ...type, roles: 'none', slots: [] }
    ])
  })

  it('the names of roles are distinct; a role without materials has no hint', () => {
    const pastor = { name: 'Пастор', count: 1, materials: false, hint: 'Нотатки' }
    expect(parseSlots([pastor, pastor])).toBeNull()
    expect(parseSlots([pastor])).toEqual([{ ...pastor, kinds: [], hint: '' }])
    // the kinds of materials of a role that prepares them
    expect(parseSlots([{ ...pastor, materials: true, kinds: ['k-sermon', 'k-sermon'] }])).toEqual([
      { ...pastor, materials: true, kinds: ['k-sermon'] }
    ])
    expect(parseSlots([{ ...pastor, materials: true, kinds: ['проповідь'] }])).toBeNull()
    expect(parseSlots([{ ...pastor, count: 0 }])).toBeNull()
  })

  it('the settings of the calendar', () => {
    expect(parseCalendar({ redDays: 2, orangeDays: 5, filters: ['mine', 'type'] })).toEqual({
      redDays: 2,
      orangeDays: 5,
      filters: ['type', 'mine']
    })
    expect(parseCalendar({ redDays: -1, orangeDays: 5, filters: [] })).toBeNull()
    expect(parseCalendar({ redDays: 1, orangeDays: 5, filters: ['colour'] })).toBeNull()
  })
})
