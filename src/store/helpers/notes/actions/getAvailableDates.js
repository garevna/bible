const { getAllKeys } = require('@/db/helpers').default

export async function getAvailableDates ({ commit }) {
  const { status, result } = await getAllKeys('notes', 'date')
  const availableDates = status === 200
    ? result.map(key => new Date(key - 0).toISOString().slice(0, 10))
    : []
  commit('setAvailableDates', availableDates)
}
