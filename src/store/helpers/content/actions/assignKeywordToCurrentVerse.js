const { getRecordByKey } = require('@/db/helpers').default

export async function assignKeywordToCurrentVerse ({ state, getters, commit, dispatch }, keyword) {
  if (!state.currentLineId) return console.error(`Illegal verse ref: ${state.currentLineId}`)

  commit('setProgress', true, { root: true })

  const id = typeof keyword === 'string' ? keyword : keyword._id

  const { status, result } = await getRecordByKey('keywords', id)

    if (status !== 200) return console.error('Keyword not found in DB: ', keyword)

    result.refs.includes(state.currentLineId) || result.refs.push(state.currentLineId)

    await dispatch('keywords/putKeyword', result, { root: true })

    commit('addKeywordToVerse', keyword)

    commit('setProgress', false, { root: true })
  }
