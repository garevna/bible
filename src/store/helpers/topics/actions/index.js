const context = require.context('./', false)

const moduleNames = context.keys().filter(key => key !== './' && key !== './index' && key !== './index.js')

const modules = Object.assign({}, ...moduleNames.map(name => ({ [name.split('./').join('').split('.js').join('')]: context(name) })))

export default Object.assign({}, ...Object.keys(modules).map(key => ({ [key]: modules[key][key] })))
