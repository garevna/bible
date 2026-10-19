/**
 * Dates in the words of the language of the app (as in client-side): the locale of the language,
 * never the one of the browser.
 */

/** the locale of a language of the app */
export const localeOf = (lang: string) => ({ ua: 'uk', ru: 'ru', en: 'en' })[lang] ?? 'uk'

/** 'YYYY-MM-DD' of a date in local time */
export function toISODateString(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** the full date without the weekday: "16 жовтня 2026 р." */
export function fullDateFormat(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date).split(', ').slice(1).join(', ')
}

/** a date: iso 2026-10-16, short 16.10.2026, full 16 жовтня 2026 р. */
export function formatDate(date: Date, locale: string) {
  return {
    iso: toISODateString(date),
    short: new Intl.DateTimeFormat([locale]).format(date),
    full: fullDateFormat(date, locale)
  }
}

/** a moment: "16 жовтня о 20:16" */
export const formatDateTime = (ms: number, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    // the 24-hour clock in every language (English would say PM)
    hourCycle: 'h23'
  }).format(new Date(ms))

/** a day of the calendar: "пт, 16 жовт." */
export const formatDay = (day: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(`${day}T12:00:00`)
  )
