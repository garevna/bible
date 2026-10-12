import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'

/** Public keys of the Firebase Auth ID tokens */
const FIREBASE_KEYS =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

let remoteKeys: JWTVerifyGetKey | undefined

export interface AuthUser {
  uid: string
  /** the email of the account, shown in the dashboard */
  email: string | null
  /** the app does not verify emails: only a verified one (e.g. Google sign in) says who the user is */
  emailVerified: boolean
  name: string | null
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
  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === 'string' ? payload.name : null
  }
}

/**
 * The owners are listed in the worker settings (OWNERS): Firebase user ids and verified emails,
 * separated by commas. They are administrators that the dashboard cannot change.
 */
export function isOwner(user: Pick<AuthUser, 'uid' | 'email' | 'emailVerified'>, owners: string): boolean {
  const list = owners
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  // user ids are case sensitive, emails are not
  if (list.includes(user.uid)) return true
  const email = user.emailVerified ? user.email?.toLowerCase() : undefined
  return email !== undefined && list.some((entry) => entry.toLowerCase() === email)
}
