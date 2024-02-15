import { getUser } from './getUser'

export async function initFirebaseUser (login) {
  if (!login) return console.warn('User login is not defined')

  const user = await getUser(login)

  return user
}
