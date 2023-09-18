export function getLeft (rest, added) {
  const interval = rest.find(item => item.start < added.start && item.end <= added.end)
  if (!interval) return []
  if (interval.color !== added.color) {
    return [{ start: interval.start, end: added.start - 1, color: interval.color }]
  } else {
    Object.assign(added, { start: interval.start })
    return []
  }
}
