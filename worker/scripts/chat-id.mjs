/**
 * Prints the ids of the chats the bot has seen, e.g. a private test channel.
 * The token is read from worker/.dev.vars, so it is never typed in a terminal or a chat.
 *   1. add the bot to the channel as an administrator that may post messages
 *   2. post any message in the channel
 *   3. pnpm worker:chat-id            (the bot of the public channel)
 *      pnpm worker:chat-id service    (the service bot)
 * A bot with a webhook (the service bot, once somebody linked Telegram) gets no updates by getUpdates:
 * the webhook is taken off for the moment and set back as it was, with the same secret.
 */
import { readFileSync } from 'node:fs'

const vars = readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8')
const name = process.argv[2] === 'service' ? 'SERVICE_BOT_TOKEN' : 'TELEGRAM_BOT_TOKEN'
const token = vars.match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1]?.trim()
if (!token) {
  console.error(`${name} is empty in worker/.dev.vars`)
  process.exit(1)
}

const api = async (method, body = {}) => {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
  return response.json()
}

/** the secret of the webhook, as the worker derives it from the token (worker/src/serviceBot.ts) */
async function webhookSecret() {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(token),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('webhook')))
  return Buffer.from(signature).toString('base64url')
}

const webhook = (await api('getWebhookInfo')).result?.url
if (webhook) await api('deleteWebhook')

try {
  const { ok, result, description } = await api('getUpdates', {
    allowed_updates: ['message', 'channel_post', 'my_chat_member']
  })
  if (!ok) {
    console.error(`Telegram: ${description}`)
    process.exitCode = 1
  } else {
    const chats = new Map()
    for (const update of result) {
      const chat = (update.channel_post ?? update.message ?? update.my_chat_member)?.chat
      if (chat && chat.type !== 'private')
        chats.set(chat.id, `${chat.title ?? chat.username ?? ''} (${chat.type})${chat.username ? ` @${chat.username}` : ''}`)
    }
    if (!chats.size) console.log('No chats yet: post a message in the channel and run again')
    for (const [id, title] of chats) console.log(`${id}  ${title}`)
  }
} finally {
  // the worker keeps getting the updates
  if (webhook) {
    const set = await api('setWebhook', {
      url: webhook,
      secret_token: await webhookSecret(),
      allowed_updates: ['message', 'callback_query']
    })
    console.log(set.ok ? 'The webhook is set back' : `The webhook could not be set back: ${set.description}`)
  }
}
