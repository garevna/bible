/**
 * Uploads the filled settings of worker/.dev.vars to the Cloudflare secrets of the worker:
 * TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, OWNERS, SERVICE_BOT_TOKEN, SERVICE_CHAT_ID. The values are never printed.
 *   pnpm worker:secrets                        all of them
 *   pnpm worker:secrets SERVICE_CHAT_ID        only the named ones (e.g. another service channel)
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const all = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'OWNERS', 'SERVICE_BOT_TOKEN', 'SERVICE_CHAT_ID']
const chosen = process.argv.slice(2)
const unknown = chosen.filter((name) => !all.includes(name))
if (unknown.length) {
  console.error(`Unknown: ${unknown.join(', ')}; the settings are ${all.join(', ')}`)
  process.exit(1)
}
const names = chosen.length ? chosen : all
const workerDir = fileURLToPath(new URL('..', import.meta.url))
const vars = readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8')

for (const name of names) {
  const value = vars.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]?.trim()
  if (!value) {
    console.log(`${name}: empty in .dev.vars, skipped`)
    continue
  }
  // the name is one of the constants above, the value goes through stdin
  const result = spawnSync(`pnpm exec wrangler secret put ${name}`, {
    cwd: workerDir,
    input: value,
    encoding: 'utf8',
    shell: true,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }
  })
  console.log(`${name}: ${result.status === 0 ? 'uploaded' : `failed\n${result.stderr}`}`)
}
