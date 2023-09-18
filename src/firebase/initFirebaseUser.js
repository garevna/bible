import { getFirebaseUser } from './getFirebaseUser'

export async function initFirebaseUser (login) {
  if (!login) return console.warn('User login is not defined')

  const user = await getFirebaseUser(login)

  return user
}
