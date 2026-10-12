/**
 * A picture chosen by the user, made small enough to keep in the profile or a topic:
 * at most `size` px on the longer side (or a square of `size` px cut from the middle), as a JPEG data URL.
 */
export async function resizeImage(
  file: Blob,
  { size, square = false, quality = 0.85 }: { size: number; square?: boolean; quality?: number }
): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const source = square
      ? { x: (bitmap.width - side) / 2, y: (bitmap.height - side) / 2, width: side, height: side }
      : { x: 0, y: 0, width: bitmap.width, height: bitmap.height }
    const scale = Math.min(1, size / Math.max(source.width, source.height))
    const width = Math.round(source.width * scale)
    const height = Math.round(source.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')!
    // JPEG has no transparency: a white ground instead of black
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, source.x, source.y, source.width, source.height, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    bitmap.close()
  }
}

/** Opens the file dialog for one picture; null when nothing is chosen */
export function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}
