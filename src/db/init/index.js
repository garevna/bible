import {
  dbName,
  storeNames,
  mainKeys,
  dbKeys
} from '../db-configs'

import { dbVersionHandler } from './dbVersionHandler'
import { correctVersionNumber } from './correctVersionNumber'
import { testDBVersion } from './testDBVersion'
import { upgradeDB } from './upgradeDB'
import { upgradeNeededEventHandler } from './upgradeNeededEventHandler'

export {
  dbName,
  storeNames,
  mainKeys,
  dbKeys,

  dbVersionHandler,
  correctVersionNumber,
  testDBVersion,
  upgradeNeededEventHandler,
  upgradeDB
}
