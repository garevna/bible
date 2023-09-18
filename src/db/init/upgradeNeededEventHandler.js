import { upgradeDB } from './'

export function upgradeNeededEventHandler (event) {
  return new Promise(resolve => {
    const db = event.target.result
    const transaction = event.target.transaction

    db.onerror = db.onabort = event => resolve({
      status: event.target.error.code,
      result: null,
      errorType: 'Open DB',
      errorMessage: event.target.error.message
    })

    db.onversionchange = event => resolve({
      status: 100,
      result: db,
      message: true,
      messageType: 'Open DB',
      messageText: 'DB version changed. You should refresh the browser window'
    })

    upgradeDB(db, transaction)
  })
}
