import { describe, expect, it } from 'vitest'

import { formatDate, formatDateTime, localeOf } from './dates'

describe('dates in the words of the language of the app', () => {
  const date = new Date(2026, 9, 16, 20, 16)

  it('the locale of the language, not of the browser', () => {
    expect(localeOf('ua')).toBe('uk')
    expect(localeOf('en')).toBe('en')
  })

  it('a date, short and full', () => {
    expect(formatDate(date, 'uk')).toEqual({
      iso: '2026-10-16',
      short: '16.10.2026',
      full: '16 жовтня 2026 р.'
    })
    // the year stays in English too
    expect(formatDate(date, 'en').full).toBe('October 16, 2026')
  })

  it('a moment with the time of the day', () => {
    expect(formatDateTime(date.getTime(), 'uk')).toBe('16 жовтня о 20:16')
  })
})
