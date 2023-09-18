export function getCovering (rest, added) {
  const interval = rest.find(item => item.start < added.start && item.end > added.end)
  if (!interval) return []
  if (interval.color !== added.color) {
    return [
      { start: interval.start, end: added.start, color: interval.color },
      { start: added.end, end: interval.end, color: interval.color }
    ]
  } else {
    Object.assign(added, { start: interval.start, end: interval.end })
    return []
  }
}
