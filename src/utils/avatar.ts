/** Largest image file accepted as an avatar */
export const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024

/** Square avatar of `size` px cut from the center of the image, as a data URL */
export function resizeAvatar(file: File, size = 100): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      const side = Math.min(img.width, img.height)
      const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size })
      canvas
        .getContext('2d')!
        .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Not an image'))
    }

    img.src = url
  })
}
