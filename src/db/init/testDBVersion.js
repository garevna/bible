import {
  dbName,
  dbVersionHandler,
  upgradeDB,
  correctVersionNumber
} from './'

export const testDBVersion = () => new Promise((resolve) => Object.assign(indexedDB.open(dbName), {
  onupgradeneeded: (event) => {
    const { result: db, transaction } = event.target

    upgradeDB(db, transaction)

    resolve({ status: 200 })
  },

  onsuccess: event => {
    const { result: db } = event.target

    correctVersionNumber(db)

    db.close()

    resolve({ status: 200, result: { version: dbVersionHandler() } })
  },

  onerror: event => resolve({
    event,
    status: event.target.error.code,
    result: null,
    error: {
      errorTarget: 'TEST DB VERSION',
      errorName: event.target.error.name,
      message: event.target.error.message,
      version: event.target.version || dbVersionHandler()
    }
  })
}))
