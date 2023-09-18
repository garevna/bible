import { getLeft } from './getLeft'
import { getRight } from './getRight'
import { getCovering } from './getCovering'

export function updateIntervals (intervals, added) {
  const result = intervals.filter(interval => interval.end < added.start || interval.start > added.end)

  const rest = intervals
    .filter(interval => !result.includes(interval))
    .filter(interval => !(interval.start >= added.start && interval.end <= added.end))

  result.push(...getLeft(rest, added), ...getRight(rest, added), ...getCovering(rest, added), added)

  return result.sort((a, b) => a.start - b.start)
}
