import { covenantNames } from '../configs'

const { getAllKeys } = require('./helpers').default
const methods = require('./methods').default

/* eslint-disable no-extend-native */

Number.prototype.format = function () {
  return this.toString().padStart(3, '0')
}

class ContentController {
  constructor () {
    this.covenantNames = covenantNames
    this.testLocalDB()
  }
}

Object.assign(ContentController.prototype, methods, { getAllKeys })

export const contentController = new ContentController()
