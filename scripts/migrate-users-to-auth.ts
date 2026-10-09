/**
 * Moves the users of the Vue 2 version to Firebase Auth, keeping their logins and passwords.
 *
 * The old version kept sha256(password) in users/{login}/creds. Firebase Auth imports users
 * with such hashes (algorithm SHA256, one round), so everybody signs in with the same login and
 * password: the app turns a login into a technical email (src/utils/loginEmail.ts).
 * The data moves from users/{login} to users/{uid}.
 *
 *   node scripts/migrate-users-to-auth.ts --key <key.json>                  dry run: shows what will happen
 *   node scripts/migrate-users-to-auth.ts --key <key.json> --apply          imports the users, copies their data
 *   node scripts/migrate-users-to-auth.ts --key <key.json> --check <login>  asks the password and signs in
 *   node scripts/migrate-users-to-auth.ts --key <key.json> --undo           removes the imported accounts and copies
 *   node scripts/migrate-users-to-auth.ts --key <key.json> --delete-legacy  removes users/{login} with the old
 *                                                                           password hashes (no undo after this)
 *
 * The key: Firebase console > Project settings > Service accounts > Generate new private key.
 * Keep it out of the repository. VITE_API_DOMAIN and VITE_API_KEY are read from .env.local.
 * Re-running --apply is safe: migrated users are skipped.
 */
import { readFileSync } from 'node:fs'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { parseArgs } from 'node:util'

import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth, type UserImportRecord } from 'firebase-admin/auth'
import { FieldValue, getFirestore, type DocumentSnapshot } from 'firebase-admin/firestore'

import { loginEmail } from '../src/utils/loginEmail.ts'

const userCollections = ['keywords', 'topics', 'notes', 'highlights']
const profileFields = ['userName', 'avatar', 'city', 'country', 'lang', 'translation']

const { values: options } = parseArgs({
  options: {
    key: { type: 'string' },
    apply: { type: 'boolean', default: false },
    check: { type: 'string' },
    undo: { type: 'boolean', default: false },
    'delete-legacy': { type: 'boolean', default: false }
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
    'Usage: node scripts/migrate-users-to-auth.ts --key <service-account.json> [--apply | --check <login> | --undo | --delete-legacy]'
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

/** users/{login} documents of the Vue 2 version: they have the creds collection or were migrated */
async function legacyUsers() {
  const users = await db.collection('users').get()
  const legacy: DocumentSnapshot[] = []
  for (const user of users.docs) {
    if (user.data().migratedTo || !(await user.ref.collection('creds').limit(1).get()).empty)
      legacy.push(user)
  }
  return legacy
}

const legacy = await legacyUsers()
console.log(`users of the old version: ${legacy.length}`)

/* ---------- --undo: back to the state before --apply ---------- */

if (options.undo) {
  let undone = 0
  for (const user of legacy) {
    const uid = user.data()!.migratedTo
    if (!uid) continue
    await auth.deleteUser(uid).catch((error) => console.warn(`  ${user.id}: ${error.message}`))
    await db.recursiveDelete(db.doc(`users/${uid}`))
    await user.ref.update({ migratedTo: FieldValue.delete() })
    undone++
  }
  console.log(`undone: ${undone}`)
  process.exit(0)
}

/* ---------- --delete-legacy: after checking that sign in works ---------- */

if (options['delete-legacy']) {
  let deleted = 0
  for (const user of legacy) {
    if (!user.data()!.migratedTo) {
      console.warn(`  ${user.id}: not migrated yet, kept`)
      continue
    }
    await db.recursiveDelete(user.ref)
    deleted++
  }
  console.log(`deleted old documents: ${deleted}`)
  process.exit(0)
}

/* ---------- dry run / --apply ---------- */

const records: (UserImportRecord & { login: string; source: DocumentSnapshot })[] = []

for (const user of legacy) {
  const login = user.id
  if (user.data()!.migratedTo) {
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
    source: user,
    uid: db.collection('users').doc().id,
    email: await loginEmail(login, domain),
    displayName: user.data()!.userName || login,
    passwordHash: Buffer.from(hash, 'hex')
  })
}

console.log(`users to migrate: ${records.length}`)
records.forEach(({ login }) => console.log(`  ${login}`))

if (!options.apply) {
  console.log('\nDry run. Add --apply to migrate them.')
  process.exit(0)
}

/** users/{login} -> users/{uid}: the profile and the user's collections */
async function copyData(source: DocumentSnapshot, uid: string) {
  const data = source.data()!
  const profile = Object.fromEntries(
    profileFields.filter((key) => key in data).map((key) => [key, data[key]])
  )
  await db.doc(`users/${uid}`).set({ ...profile, legacyLogin: source.id })

  for (const name of userCollections) {
    const items = await source.ref.collection(name).get()
    for (let start = 0; start < items.size; start += 400) {
      const batch = db.batch()
      items.docs
        .slice(start, start + 400)
        .forEach((item) => batch.set(db.doc(`users/${uid}/${name}/${item.id}`), item.data()))
      await batch.commit()
    }
  }
}

let migrated = 0
for (let start = 0; start < records.length; start += 1000) {
  const batch = records.slice(start, start + 1000)
  const result = await auth.importUsers(
    batch.map(({ login: _login, source: _source, ...record }) => record),
    { hash: { algorithm: 'SHA256', rounds: 1 } }
  )

  const failed = new Set(result.errors.map(({ index }) => index))
  result.errors.forEach(({ index, error }) => console.error(`  ${batch[index].login}: ${error.message}`))

  for (const [index, { login, source, uid }] of batch.entries()) {
    if (failed.has(index)) continue
    await copyData(source, uid)
    await source.ref.update({ migratedTo: uid })
    console.log(`  ${login} -> users/${uid}`)
    migrated++
  }
}

console.log(`\nmigrated: ${migrated} of ${records.length}`)
console.log('Check a login with --check <login>, then remove the old documents with --delete-legacy.')
