import type { UsersStore } from './users'

/**
 * The service bot: a bot of its own (not the one of the public channel) that writes to the ministers
 * in private: invitations with the buttons "Підтвердити" / "Не можу", the notices of the calendar,
 * the messages of the app. A minister links Telegram once: the app opens the bot with a one-time token
 * (t.me/<bot>?start=<token>), the minister presses Start. An optional service chat (a channel or a
 * group of the ministers) gets the emergencies too.
 */

/** an answer asked by the buttons of a message: to an invitation, as the main person or the backup */
export interface Ask {
  eventId: string
  day: string
  /** the main person of the invitation (the backup answers for their place) */
  uid: string
  as: 'main' | 'backup'
}

export interface ServiceBot {
  /** a private message to a linked user (nothing for one who is not linked); a row of buttons for each answer */
  send(uid: string, text: string, asks?: Ask[]): Promise<void>
  /** a message to the service chat, when there is one */
  broadcast(text: string): Promise<void>
}

export const NO_BOT: ServiceBot = { send: async () => undefined, broadcast: async () => undefined }

const LINK_LIFE = 15 * 60
/** the buttons of an invitation answer for as long as its days may be in the calendar */
const ASK_LIFE = 70 * 24 * 60 * 60

const chatKey = (chatId: number | string) => `tg:${chatId}`
const linkKey = (token: string) => `link:${token}`
const askKey = (key: string) => `ask:${key}`

const api = (token: string, method: string) => `https://api.telegram.org/bot${token}/${method}`

async function call(fetcher: typeof fetch, token: string, method: string, body: unknown) {
  const response = await fetcher(api(token, method), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
  return (await response.json().catch(() => ({}))) as { ok?: boolean; result?: Record<string, unknown> }
}

/** the secret Telegram puts into the header of every update: derived from the token, no setting of its own */
export async function webhookSecret(token: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(token),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('webhook')))
  return btoa(String.fromCharCode(...signature))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** The bot of the worker: chats of the linked users come from the users' records */
export function serviceBot(
  token: string | undefined,
  chat: string | undefined,
  store: UsersStore,
  chatOf: (uid: string) => number | undefined,
  fetcher: typeof fetch
): ServiceBot {
  if (!token) return NO_BOT
  return {
    async send(uid, text, asks = []) {
      const chatId = chatOf(uid)
      if (!chatId) return
      // several days: each row says its day
      const rows = await Promise.all(
        asks.map(async (ask) => {
          const key = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
          await store.put(askKey(key), JSON.stringify({ ...ask, chatId }), { expirationTtl: ASK_LIFE })
          const day = asks.length > 1 ? `${ask.day.slice(8)}.${ask.day.slice(5, 7)}: ` : ''
          const yes = ask.as === 'backup' ? 'Згоден бути дублером' : 'Підтвердити'
          return [
            { text: `✅ ${day}${yes}`, callback_data: `${key}|c` },
            { text: `❌ ${day}Не можу`, callback_data: `${key}|d` }
          ]
        })
      )
      const reply_markup = rows.length ? { inline_keyboard: rows } : undefined
      // a failed message must not fail what the user did in the app
      await call(fetcher, token, 'sendMessage', { chat_id: chatId, text, reply_markup }).catch(
        () => undefined
      )
    },
    async broadcast(text) {
      if (chat) await call(fetcher, token, 'sendMessage', { chat_id: chat, text }).catch(() => undefined)
    }
  }
}

/** The username of the bot (asked once) and its webhook, set the first time somebody links */
export async function linkUrl(
  token: string,
  store: UsersStore,
  uid: string,
  webhook: string,
  fetcher: typeof fetch
): Promise<string | null> {
  let username = await store.get('settings:serviceBot:username')
  if (!username) {
    const me = await call(fetcher, token, 'getMe', {})
    username = typeof me.result?.username === 'string' ? me.result.username : null
    if (!username) return null
    await store.put('settings:serviceBot:username', username)
  }
  if ((await store.get('settings:serviceBot:webhook')) !== webhook) {
    const set = await call(fetcher, token, 'setWebhook', {
      url: webhook,
      secret_token: await webhookSecret(token),
      allowed_updates: ['message', 'callback_query']
    })
    if (!set.ok) return null
    await store.put('settings:serviceBot:webhook', webhook)
  }
  const link = crypto.randomUUID().replace(/-/g, '')
  await store.put(linkKey(link), uid, { expirationTtl: LINK_LIFE })
  return `https://t.me/${username}?start=${link}`
}

export const uidOfChat = (store: UsersStore, chatId: number) => store.get(chatKey(chatId))

/** The user of a link token (it works once) */
export async function takeLink(store: UsersStore, link: string) {
  const uid = await store.get(linkKey(link))
  if (uid) await store.delete(linkKey(link))
  return uid
}

export const rememberChat = (store: UsersStore, chatId: number, uid: string) =>
  store.put(chatKey(chatId), uid)
export const forgetChat = (store: UsersStore, chatId: number) => store.delete(chatKey(chatId))

/** The answer asked by a button, for the chat that has it */
export async function askOf(store: UsersStore, key: string, chatId: number) {
  const ask = await store.get<Ask & { chatId: number }>(askKey(key), 'json')
  return ask && ask.chatId === chatId ? ask : null
}

export const reply = (token: string, fetcher: typeof fetch, chatId: number, text: string) =>
  call(fetcher, token, 'sendMessage', { chat_id: chatId, text }).catch(() => undefined)

/** the button was pressed: a short notice, and the message keeps its text with the answer, without buttons */
export async function answered(
  token: string,
  fetcher: typeof fetch,
  callbackId: string,
  message: { chat: { id: number }; message_id: number; text?: string } | undefined,
  notice: string
) {
  await call(fetcher, token, 'answerCallbackQuery', { callback_query_id: callbackId, text: notice }).catch(
    () => undefined
  )
  if (!message) return
  await call(fetcher, token, 'editMessageText', {
    chat_id: message.chat.id,
    message_id: message.message_id,
    text: `${message.text ?? ''}\n\n${notice}`
  }).catch(() => undefined)
}
