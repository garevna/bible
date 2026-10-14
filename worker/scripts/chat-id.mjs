/**
 * Prints the ids of the chats the bot has seen, e.g. a private test channel.
 * The token is read from worker/.dev.vars, so it is never typed in a terminal or a chat.
 *   1. add the bot to the channel as an administrator that may post messages
 *   2. post any message in the channel
 *   3. pnpm worker:chat-id            (the bot of the public channel)
 *      pnpm worker:chat-id service    (the service bot: its service chat, before anybody links Telegram,
 *                                      as the webhook takes the updates from then on)
 */
import { readFileSync } from 'node:fs'

const vars = readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8')
const name = process.argv[2] === 'service' ? 'SERVICE_BOT_TOKEN' : 'TELEGRAM_BOT_TOKEN'
const token = vars.match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1]?.trim()
if (!token) {
  console.error(`${name} is empty in worker/.dev.vars`)
  process.exit(1)
}

const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`)
const { ok, result, description } = await response.json()
if (!ok) {
  console.error(`Telegram: ${description}`)
  process.exit(1)
}

const chats = new Map()
for (const update of result) {
  const chat = (update.channel_post ?? update.message ?? update.my_chat_member)?.chat
  if (chat) chats.set(chat.id, `${chat.title ?? chat.username ?? ''} (${chat.type})${chat.username ? ` @${chat.username}` : ''}`)
}
if (!chats.size) console.log('No chats yet: post a message in the channel and run again')
for (const [id, name] of chats) console.log(`${id}  ${name}`)
