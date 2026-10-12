import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'

/** Public keys of the Firebase Auth ID tokens */
const FIREBASE_KEYS =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

let remoteKeys: JWTVerifyGetKey | undefined

export interface AuthUser {
  uid: string
  email: string | null
}

/**
 * Verifies a Firebase ID token (signature, project, expiry) and returns its user.
 * `keys` is for tests; the worker uses the Google keys, cached between requests.
 */
export async function verifyIdToken(
  token: string,
  projectId: string,
  keys?: JWTVerifyGetKey
): Promise<AuthUser> {
  remoteKeys ??= createRemoteJWKSet(new URL(FIREBASE_KEYS))
  const { payload } = await jwtVerify(token, keys ?? remoteKeys, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ['RS256']
  })
  if (!payload.sub) throw new Error('No user in the token')
  // the app does not verify emails, so only a verified one (e.g. Google sign in) says who the user is
  const email = typeof payload.email === 'string' && payload.email_verified === true ? payload.email : null
  return { uid: payload.sub, email }
}

export type Role = 'publisher' | 'reader'

/**
 * For the demo the publishers are listed in the worker settings (PUBLISHERS): Firebase user ids
 * (Firebase console > Authentication) and verified emails, separated by commas.
 */
export function roleOf(user: AuthUser, publishers: string): Role {
  const list = publishers
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  const email = user.email?.toLowerCase()
  // user ids are case sensitive, emails are not
  const known =
    list.includes(user.uid) || (email !== undefined && list.some((entry) => entry.toLowerCase() === email))
  return known ? 'publisher' : 'reader'
}
