import { storeNames } from './storeNames'
import { beforeDivider } from './beforeDivider'
import { footerMenu } from './footerMenu'
import { highlights } from './highlights'

import { firebaseConfig } from './firebaseConfig'

// import { menuItems } from './menuItems'
import { langMenuItems } from './langMenuItems'
import { translationMenuItems } from './translationMenuItems'
import { defaultTranslation } from './defaultTranslation'

import { cursor } from './cursor'

const languages = require('./language').default

export {
  storeNames,
  languages,
  firebaseConfig,
  beforeDivider,
  footerMenu,
  highlights,
  cursor,
  // menuItems,
  langMenuItems,
  translationMenuItems,
  defaultTranslation
}
