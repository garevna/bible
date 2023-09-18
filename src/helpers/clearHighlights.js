export function clearHighlights (sourceArray) {
  const array = JSON.parse(JSON.stringify(sourceArray))
  array.forEach((item, index) => {
    const num = array
      .findIndex(marker => (marker.and === item.start - 1 || marker.start === item.end + 1) && marker.color === item.color)

    if (num !== -1) {
      const [start, end] = [
        Math.min(item.start, array[num].start),
        Math.max(item.end, array[num].end)
      ]
      Object.assign(item, { start, end })
      Object.assign(array[num], { start, end })
    }
  })

  const set = new Set(array.map(item => JSON.stringify(item)))
  return Array.from(set).map(item => JSON.parse(item))
}
