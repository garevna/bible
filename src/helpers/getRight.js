export function getRight (rest, added) {
  const interval = rest.find(item => item.start >= added.start && item.start < added.end && item.end > added.end)
  if (!interval) return []
  if (interval.color !== added.color) {
    return [{ start: added.end + 1, end: interval.end, color: interval.color }]
  } else {
    Object.assign(added, { end: interval.end })
    return []
  }
}
