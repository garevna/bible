import { dbName, dbVersionHandler, upgradeNeededEventHandler } from '../init'

export const openDB = () => new Promise((resolve) => Object.assign(indexedDB.open(dbName, dbVersionHandler()), {
  onversionchange: (event) => {
    console.warn({
      message: 'OPEN DB: version change event',
      oldVersion: event.oldVersion,
      newVersion: event.newVersion
    })

    resolve({ status: 200, result: event.target.result })
  },
  onblocked: (event) => {
    resolve({ status: 0, result: null })
  },

  onupgradeneeded: upgradeNeededEventHandler,

  onsuccess: event => {
    resolve({ status: 200, result: event.target.result })
  },

  onerror: event => {
    console.warn({
      errorType: 'OPEN DB ERROR EVENT',
      errorCode: event.target.error.code,
      errorName: `${event.target.error.name}: DB ver ${dbVersionHandler()}`,
      errorMessage: event.target.error.message
    })
  }
}))
