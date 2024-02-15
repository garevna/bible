export const getPromise = (store, ref) => new Promise(resolve => Object.assign(store.get(ref), {
  onsuccess: event => resolve(event.target.result),
  onerror: event => {
    console.warn(`Record ${ref} not found in db store ${store.name}`)
    resolve(null)
  }
}))
