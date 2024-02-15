const modules = Object

const request = require.context('./', false, /\.store\.js$/)

request.keys().forEach((moduleName) => {
  const name = moduleName.replace(/(\.\/|\.store\.js)/g, '')
  modules[name] = request(moduleName).default || request(moduleName)
})

export default modules
