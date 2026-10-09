/**
 * Moves the existing users to Firebase Auth, keeping their passwords.
 *
 * The Vue 2 version kept sha256(password) in users/{login}/creds. Firebase Auth imports users
 * with such hashes (algorithm SHA256, one round), so everybody signs in as before.
 *
 *   node scripts/migrate-users-to-auth.ts --key <key.json>                  dry run: shows what will happen
 *   node scripts/migrate-users-to-auth.ts --key <key.json> --apply          imports users, writes logins/{login}
 *   node scripts/migrate-users-to-auth.ts --key <key.json> --check <login>  asks the password and signs in
 *   node scripts/migrate-users-to-auth.ts --key <key.json> --delete-creds   removes the old password hashes
 *   node scripts/migrate-users-to-auth.ts --key <key.json> --undo           removes the imported accounts and
 *                                                                           logins/{login} (only before --delete-creds)
 *
 * The key: Firebase console > Project settings > Service accounts > Generate new private key.
 * Keep it out of the repository. VITE_API_DOMAIN and VITE_API_KEY are read from .env.local.
 * Re-running --apply is safe: users that already have logins/{login} are skipped.
 */
import { readFileSync } from 'node:fs'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { parseArgs } from 'node:util'

import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth, type UserImportRecord } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

import { loginEmail } from '../src/utils/loginEmail.ts'

const { values: options } = parseArgs({
  options: {
    key: { type: 'string' },
    apply: { type: 'boolean', default: false },
    check: { type: 'string' },
    'delete-creds': { type: 'boolean', default: false },
    undo: { type: 'boolean', default: false }
  }
})

function env(name: string) {
  try {
    return readFileSync('.env.local', 'utf8')
      .match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]
      ?.trim()
  } catch {
    return undefined
  }
}

const domain = env('VITE_API_DOMAIN')
if (!options.key || !domain) {
  console.error(
    'Usage: node scripts/migrate-users-to-auth.ts --key <service-account.json> [--apply | --check <login> | --delete-creds | --undo]'
  )
  console.error('VITE_API_DOMAIN must be set in .env.local')
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(readFileSync(options.key, 'utf8'))) })
const db = getFirestore()
const auth = getAuth()

/* ---------- --check: sign in like the app does ---------- */

if (options.check) {
  const login = options.check
  const readline = createInterface({ input: stdin, output: stdout })
  const password = await readline.question(`password of ${login} (shown while typing): `)
  readline.close()

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env('VITE_API_KEY')}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: await loginEmail(login, domain), password, returnSecureToken: false })
    }
  )
  const data = await response.json()
  console.log(data.localId ? `OK: ${login} signs in` : `FAILED: ${data.error?.message ?? response.status}`)
  process.exit(data.localId ? 0 : 1)
}

const users = await db.collection('users').get()
console.log(`users in Firestore: ${users.size}`)

/* ---------- --undo: back to the state before --apply ---------- */

if (options.undo) {
  let undone = 0
  for (const user of users.docs) {
    const owner = await db.doc(`logins/${user.id}`).get()
    if (!owner.exists) continue
    if ((await user.ref.collection('creds').get()).empty) {
      console.warn(`  ${user.id}: its password hash is already deleted, the account is kept`)
      continue
    }
    await auth.deleteUser(owner.data()!.uid).catch((error) => console.warn(`  ${user.id}: ${error.message}`))
    await owner.ref.delete()
    undone++
  }
  console.log(`undone: ${undone}`)
  process.exit(0)
}

/* ---------- --delete-creds: after checking that sign in works ---------- */

if (options['delete-creds']) {
  let deleted = 0
  for (const user of users.docs) {
    if (!(await db.doc(`logins/${user.id}`).get()).exists) {
      console.warn(`  ${user.id}: not migrated yet, its password hash is kept`)
      continue
    }
    for (const item of (await user.ref.collection('creds').get()).docs) {
      await item.ref.delete()
      deleted++
    }
  }
  console.log(`deleted password hashes: ${deleted}`)
  process.exit(0)
}

/* ---------- dry run / --apply ---------- */

const records: (UserImportRecord & { login: string })[] = []

for (const user of users.docs) {
  const login = user.id

  if ((await db.doc(`logins/${login}`).get()).exists) {
    console.log(`  ${login}: already migrated`)
    continue
  }

  const hash = (await user.ref.collection('creds').get()).docs[0]?.data().password
  if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)) {
    console.warn(`  ${login}: no valid password hash, skipped`)
    continue
  }

  records.push({
    login,
    uid: db.collection('logins').doc().id,
    email: await loginEmail(login, domain),
    displayName: login,
    passwordHash: Buffer.from(hash, 'hex')
  })
}

console.log(`users to import: ${records.length}`)
records.forEach(({ login, email }) => console.log(`  ${login} (${email})`))

if (!options.apply) {
  console.log('\nDry run. Add --apply to import them.')
  process.exit(0)
}

let imported = 0
for (let start = 0; start < records.length; start += 1000) {
  const batch = records.slice(start, start + 1000)
  const result = await auth.importUsers(
    batch.map(({ login: _login, ...record }) => record),
    { hash: { algorithm: 'SHA256', rounds: 1 } }
  )

  const failed = new Set(result.errors.map(({ index }) => index))
  result.errors.forEach(({ index, error }) => console.error(`  ${batch[index].login}: ${error.message}`))

  for (const [index, { login, uid }] of batch.entries()) {
    if (failed.has(index)) continue
    await db.doc(`logins/${login}`).set({ uid })
    await db.doc(`users/${login}`).set({ uid }, { merge: true })
    imported++
  }
}

console.log(`\nimported: ${imported} of ${records.length}`)
console.log('Check a login with --check <login>, then remove the old hashes with --delete-creds.')
