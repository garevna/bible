import { covenantNames } from './covenantNames'
import { beforeDivider } from './beforeDivider'
import { footerMenu } from './footerMenu'
import { highlights } from './highlights'

import { firebaseConfig } from './firebaseConfig'

import { menuItems } from './menuItems'

// import * as languages from './language'

const languages = require('./language').default

export {
  languages,
  firebaseConfig,
  covenantNames,
  beforeDivider,
  footerMenu,
  highlights,
  menuItems
}
