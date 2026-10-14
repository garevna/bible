import type { UsersStore } from './users'

/**
 * The service bot: a bot of its own (not the one of the public channel). It writes to the ministers
 * in private (invitations with the buttons "Підтвердити" / "Не можу", the notices of the calendar,
 * the messages of the app) and duplicates the notices of the calendar into the service channel,
 * where the invited minister may answer by the same buttons.
 * A minister links Telegram once: the app opens the bot with a one-time token
 * (t.me/<bot>?start=<token>), the minister presses Start. Then the bot knows who pressed a button,
 * in private or in the channel (the id of a private chat is the id of its user).
 */

/**
 * An answer asked by the buttons of a message: to an invitation, as the main person or the backup,
 * or an application to an open event (whoever of its ministry presses it)
 */
export interface Ask {
  eventId: string
  day: string
  /** the main person of the invitation (the backup answers for their place); '' for an application */
  uid: string
  as: 'main' | 'backup' | 'apply'
}

export interface ServiceBot {
  /** a private message to a linked user (nothing for one who is not linked); a row of buttons for each answer */
  send(uid: string, text: string, asks?: Ask[]): Promise<void>
  /** a message to the service channel, when there is one; the buttons answer for the invited person */
  broadcast(text: string, asks?: Ask[]): Promise<void>
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

/** '15.10' of '2026-10-15' */
export const shortDay = (day: string) => `${day.slice(8)}.${day.slice(5, 7)}`

interface Button {
  text: string
  callback_data: string
}

/** The buttons of the answers: a row for each, which says its day when there are several */
async function buttons(store: UsersStore, chatId: number | string, asks: Ask[]): Promise<Button[][]> {
  return Promise.all(
    asks.map(async (ask) => {
      const key = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
      await store.put(askKey(key), JSON.stringify({ ...ask, chatId: String(chatId) }), {
        expirationTtl: ASK_LIFE
      })
      const day = asks.length > 1 ? `${shortDay(ask.day)}: ` : ''
      if (ask.as === 'apply') return [{ text: `🙋 ${day}Подати заявку`, callback_data: `${key}|a` }]
      const yes = ask.as === 'backup' ? 'Згоден бути дублером' : 'Підтвердити'
      return [
        { text: `✅ ${day}${yes}`, callback_data: `${key}|c` },
        { text: `❌ ${day}Не можу`, callback_data: `${key}|d` }
      ]
    })
  )
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
  /** a failed message must not fail what the user did in the app */
  const post = async (chatId: number | string, text: string, asks: Ask[]) => {
    const rows = await buttons(store, chatId, asks)
    const reply_markup = rows.length ? { inline_keyboard: rows } : undefined
    await call(fetcher, token, 'sendMessage', { chat_id: chatId, text, reply_markup }).catch(() => undefined)
  }
  return {
    async send(uid, text, asks = []) {
      const chatId = chatOf(uid)
      if (chatId) await post(chatId, text, asks)
    },
    async broadcast(text, asks = []) {
      if (chat) await post(chat, text, asks)
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

/** The answer asked by a button, for the chat that has it (a private chat, or the service channel) */
export async function askOf(store: UsersStore, key: string, chatId: number) {
  const ask = await store.get<Ask & { chatId: string | number }>(askKey(key), 'json')
  return ask && String(ask.chatId) === String(chatId) ? ask : null
}

/** a message to a private chat, with a keyboard of its own (e.g. the button that shares the number) */
export const reply = (
  token: string,
  fetcher: typeof fetch,
  chatId: number,
  text: string,
  reply_markup?: unknown
) => call(fetcher, token, 'sendMessage', { chat_id: chatId, text, reply_markup }).catch(() => undefined)

/** a message with the buttons, as a callback brings it */
export interface ButtonsMessage {
  chat: { id: number }
  message_id: number
  text?: string
  reply_markup?: { inline_keyboard: Button[][] }
}

/** A short notice to the one who pressed a button (an answer that changed nothing) */
export const toast = (token: string, fetcher: typeof fetch, callbackId: string, text: string) =>
  call(fetcher, token, 'answerCallbackQuery', {
    callback_query_id: callbackId,
    text,
    show_alert: true
  }).catch(() => undefined)

/**
 * The button was pressed and answered: a short notice, and the message keeps its text with the answer
 * added; the row of the answered day goes, the rows of the other days stay (all of them stay when
 * others may press the same button, as in an open call for applications)
 */
export async function answered(
  token: string,
  fetcher: typeof fetch,
  callbackId: string,
  message: ButtonsMessage | undefined,
  pressed: string,
  notice: string,
  line: string,
  keepRows = false
) {
  await call(fetcher, token, 'answerCallbackQuery', { callback_query_id: callbackId, text: notice }).catch(
    () => undefined
  )
  if (!message) return
  const key = pressed.split('|')[0]
  const rows = (message.reply_markup?.inline_keyboard ?? []).filter(
    (row) => keepRows || !row.some((button) => button.callback_data.split('|')[0] === key)
  )
  await call(fetcher, token, 'editMessageText', {
    chat_id: message.chat.id,
    message_id: message.message_id,
    text: `${message.text ?? ''}\n${line}`,
    reply_markup: { inline_keyboard: rows }
  }).catch(() => undefined)
}
