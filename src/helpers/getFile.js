export function getFile (file, size) {
  if (!file || !this.validFile) return { avatar: null, alignImage: 'center' }

  return new Promise(resolve => {
    const reader = Object.assign(new FileReader(), {
      onload: function (event) {
        const img = document.createElement('img')
        img.onload = function (event) {
          const { width, height } = img
          const alignImage = width > height ? 'baseline' : 'center'
          const [w, h] = width > height
            ? [width * size / height, size]
            : [size, height * size / width]
          const newX = Math.round((w - size) / 2)
          const canvas = document.createElement('canvas')
          Object.assign(canvas, { width: w, height: h })
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, newX, 0, width, height, 0, 0, w, h)
          const data = canvas.toDataURL(file)
          resolve({ avatar: data, alignImage })
        }
        img.src = event.target.result
      }
    })
    reader.readAsDataURL(file)
  })
}
