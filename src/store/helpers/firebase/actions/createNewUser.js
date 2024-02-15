export async function createNewUser ({ state, getters, commit, dispatch }, user) {
  commit('setProgress', true, { root: true })

  const { userName = '', avatar = null, city = '', country = '', login, password } = user

  if (!login || !password) throw new Error(`User creds are not valid: ${login}: ${password}`)

  const [documentId, documentData] = [login, { userName, avatar, city, country }]

  const { docRef } = await getters.createUserDocument(documentId, documentData)

  if (!docRef) throw new Error(`Error while user ${login} creation`)

  const result = await getters.createSubCollection(docRef, 'creds', { login, password })

  if (result.status !== 200) return

  dispatch('user/setUser', user, { root: true })

  await dispatch('user/signIn', null, { root: true })

  commit('setProgress', false, { root: true })
}
