import type { Marker } from '@/types'

import { clone } from './array'

/** Merges adjacent markers of the same color and drops duplicates */
export function clearHighlights(source: Marker[]): Marker[] {
  const array = clone(source)

  array.forEach((item) => {
    const num = array.findIndex(
      (marker) =>
        (marker.end === item.start - 1 || marker.start === item.end + 1) && marker.color === item.color
    )

    if (num !== -1) {
      const [start, end] = [Math.min(item.start, array[num].start), Math.max(item.end, array[num].end)]
      Object.assign(item, { start, end })
      Object.assign(array[num], { start, end })
    }
  })

  return Array.from(new Set(array.map((item) => JSON.stringify(item)))).map((item) => JSON.parse(item))
}

function getLeft(rest: Marker[], added: Marker): Marker[] {
  const interval = rest.find((item) => item.start < added.start && item.end <= added.end)
  if (!interval) return []
  if (interval.color !== added.color) {
    return [{ start: interval.start, end: added.start - 1, color: interval.color }]
  }
  added.start = interval.start
  return []
}

function getRight(rest: Marker[], added: Marker): Marker[] {
  const interval = rest.find(
    (item) => item.start >= added.start && item.start < added.end && item.end > added.end
  )
  if (!interval) return []
  if (interval.color !== added.color) {
    return [{ start: added.end + 1, end: interval.end, color: interval.color }]
  }
  added.end = interval.end
  return []
}

function getCovering(rest: Marker[], added: Marker): Marker[] {
  const interval = rest.find((item) => item.start < added.start && item.end > added.end)
  if (!interval) return []
  if (interval.color !== added.color) {
    return [
      { start: interval.start, end: added.start - 1, color: interval.color },
      { start: added.end + 1, end: interval.end, color: interval.color }
    ]
  }
  Object.assign(added, { start: interval.start, end: interval.end })
  return []
}

/** Applies a new marker on top of existing ones, splitting or extending them */
export function updateIntervals(intervals: Marker[] = [], added: Marker): Marker[] {
  const result = intervals.filter((interval) => interval.end < added.start || interval.start > added.end)

  const rest = intervals
    .filter((interval) => !result.includes(interval))
    .filter((interval) => !(interval.start >= added.start && interval.end <= added.end))

  result.push(...getLeft(rest, added), ...getRight(rest, added), ...getCovering(rest, added), added)

  return result.sort((a, b) => a.start - b.start)
}

const escapeHTML = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Verse text with highlighted fragments wrapped into colored spans */
export function getHTML({ verse, colored }: { verse: string; colored?: Marker[] }) {
  if (!colored?.length) return ''

  let html = escapeHTML(verse)

  for (const { color, start, end } of colored) {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < 0) continue

    const piece = escapeHTML(verse.slice(start, end + 1))
    if (!piece) continue

    html = html.split(piece).join(`<span style="background: ${color}">${piece}</span>`)
  }

  return html
}
