const invalid = [-1, null, NaN, undefined]

export function getHTML ({ verse, colored }) {
  if (!colored) return ''
  let html = verse
  for (const marker of colored) {
    const { color, start, end } = marker
    const piece = verse.slice(start, end + 1)

    if (invalid.includes(start) || invalid.includes(end)) continue

    html = html
      .split(piece)
      .join(piece ? `<span style="background: ${color}">${piece}</span>` : '')
  }

  return html
}
