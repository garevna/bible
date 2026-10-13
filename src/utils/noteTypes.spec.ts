import { describe, expect, it } from 'vitest'

import {
  DEFAULT_TYPES,
  isExpired,
  mayPublish,
  termFromDate,
  typedFieldsOf,
  typedOf,
  typeOf,
  type NoteType
} from './noteTypes'

const type = (id: string) => DEFAULT_TYPES.find((item) => item.id === id) as NoteType
const DAY = 24 * 60 * 60 * 1000

describe('types of notes and topics', () => {
  it('an old note without a type, or with a removed one, has the default type', () => {
    expect(typeOf(DEFAULT_TYPES, {}).id).toBe('internal')
    expect(typeOf(DEFAULT_TYPES, { typeId: 'gone' }).id).toBe('internal')
    expect(typeOf(DEFAULT_TYPES, { typeId: 'sermon' }).id).toBe('sermon')
    expect(typeOf([type('news')], {}).id).toBe('news')
  })

  it('a new note gets the term and the "delete after posting" of its type', () => {
    expect(typedFieldsOf(type('announcement'), 0)).toEqual({ typeId: 'announcement', expiresAt: 7 * DAY })
    expect(typedFieldsOf(type('news'), 0)).toEqual({ typeId: 'news', deleteAfterPublish: true })
    expect(typedFieldsOf(type('sermon'), 0)).toEqual({ typeId: 'sermon' })
  })

  it('a sermon is posted by its author only, not from a saved copy', () => {
    expect(mayPublish(type('sermon'), {})).toBe(true)
    expect(mayPublish(type('sermon'), { from: 'Пастор' })).toBe(false)
    expect(mayPublish(type('news'), { from: 'Пастор' })).toBe(true)
    expect(mayPublish(type('internal'), {})).toBe(false)
  })

  it('expiry and the fields copied into a new record', () => {
    expect(isExpired({ expiresAt: 10 }, 10)).toBe(true)
    expect(isExpired({ expiresAt: 11 }, 10)).toBe(false)
    expect(isExpired({}, 10)).toBe(false)
    expect(typedOf({ typeId: 'news', expiresAt: undefined, from: 'Пастор' })).toEqual({
      typeId: 'news',
      from: 'Пастор'
    })
    expect(new Date(termFromDate('2026-10-20')).getDate()).toBe(20)
  })
})
