/**
 * Uploads the filled settings of worker/.dev.vars to the Cloudflare secrets of the worker:
 * TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, PUBLISHERS. The values are never printed.
 *   pnpm worker:secrets
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const names = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'PUBLISHERS']
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
