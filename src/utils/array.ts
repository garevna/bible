type Identifiable = string | number | { _id: string }

const idOf = (item: Identifiable) => (typeof item === 'object' ? item._id : item)

/** Removes the item with the given id in place (replaces Array.prototype.removeById) */
export function removeById<T extends Identifiable>(array: T[], id: string | number) {
  const index = array.findIndex((item) => idOf(item) === id)
  index !== -1 && array.splice(index, 1)
}

/** Pushes the item unless an item with the same id is already there (replaces Array.prototype.pushUnique) */
export function pushUnique<T extends Identifiable>(array: T[], item: T) {
  const id = idOf(item)
  array.some((existing) => idOf(existing) === id) || array.push(item)
}

export const isEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

export const idFrom = (item: string | { _id: string }) => (typeof item === 'string' ? item : item._id)
