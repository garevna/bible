/*
 * Firebase Auth signs users in by email, while this app has logins.
 * Every login gets a technical email that nobody sees and that never receives mail:
 *   l + first 40 hex chars of sha256(login) @ the auth domain of the Firebase project
 * Hashing keeps any login (Cyrillic, spaces, upper case) a valid and unique email.
 *
 * Shared with scripts/migrate-users-to-auth.ts, so it must stay free of imports.
 */

export async function sha256Hex(text: string) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function loginEmail(login: string, domain: string) {
  return `l${(await sha256Hex(login)).slice(0, 40)}@${domain}`
}
