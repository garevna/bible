const executor = async resolve => {
  const [fileHandler] = await window.showOpenFilePicker()
  const file = await fileHandler.getFile()
  if (file.type !== 'text/plain') resolve({ result: null, error: 'Invalid file type' })
  const reader = Object.assign(new FileReader(), {
    onload: function (event) {
      resolve({
        result: event.target.result,
        error: null
      })
    }
  })
  reader.readAsText(file)
}

export const readTextFile = () => new Promise(resolve => executor(resolve))
