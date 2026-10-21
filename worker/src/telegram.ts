import type { TopicPost, VersePost } from './post'

/** Telegram limit for the text of one message */
export const MESSAGE_LIMIT = 4096

export const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const verseBlock = ({ text, ref }: VersePost) =>
  `<blockquote>${escape(text.trim())}\n<i>${escape(ref)}</i></blockquote>`

/** The title as Telegram shows it; with a picture it is the caption of the photo */
export const titleBlock = (post: TopicPost) => (post.title ? `<b>${escape(post.title)}</b>` : '')

/**
 * One block per title, note and verse; the message HTML of Telegram (parse_mode HTML).
 * A topic with a picture has its title under the photo, so the messages go without it.
 */
export function topicBlocks(post: TopicPost): string[] {
  const blocks = post.image || !post.title ? [] : [titleBlock(post)]
  for (const item of post.items) {
    if (item.kind === 'verse') blocks.push(verseBlock(item))
    else {
      item.text.trim() && blocks.push(escape(item.text.trim()))
      blocks.push(...item.verses.map(verseBlock))
    }
  }
  return blocks
}

/** A block longer than a message is cut at line ends, then at spaces */
function cutBlock(block: string, limit: number): string[] {
  if (block.length <= limit) return [block]
  // a cut inside tags would break the markup, so a long block goes as plain text
  const text = block.replace(/<[^>]+>/g, '')
  const parts: string[] = []
  let rest = text
  while (rest.length > limit) {
    const slice = rest.slice(0, limit)
    const at = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf(' '))
    const end = at > limit / 2 ? at : limit
    parts.push(rest.slice(0, end).trimEnd())
    rest = rest.slice(end).trimStart()
  }
  rest && parts.push(rest)
  return parts
}

/** Blocks joined into as few messages as the limit allows; a block is not split when it fits */
export function toMessages(blocks: string[], limit = MESSAGE_LIMIT): string[] {
  const messages: string[] = []
  let current = ''
  for (const block of blocks.flatMap((block) => cutBlock(block, limit))) {
    const next = current ? `${current}\n\n${block}` : block
    if (next.length <= limit) current = next
    else {
      messages.push(current)
      current = block
    }
  }
  current && messages.push(current)
  return messages
}

export const formatTopic = (post: TopicPost) => toMessages(topicBlocks(post))

export class TelegramError extends Error {}

/** Sends the messages one after another, so they keep their order in the chat */
export async function sendMessages(
  token: string,
  chatId: string,
  messages: string[],
  fetcher: typeof fetch = fetch
): Promise<number> {
  for (const text of messages) {
    const response = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true }
      })
    })
    if (!response.ok) {
      const { description } = (await response.json().catch(() => ({}))) as { description?: string }
      throw new TelegramError(description || `Telegram: ${response.status}`)
    }
  }
  return messages.length
}

/** "data:image/jpeg;base64,…" as a file for a multipart request */
function imageFile(dataUrl: string): Blob {
  const [head, base64 = ''] = dataUrl.split(',')
  const type = head?.match(/^data:([^;]+)/)?.[1] ?? 'image/jpeg'
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
  return new Blob([bytes], { type })
}

/**
 * Sends the picture with its caption (up to 1024 characters): a data URL, or a picture kept in
 * Telegram already ('tg:' and the id of its file: not sent again). The id of the file sent comes back.
 */
export async function sendPhoto(
  token: string,
  chatId: string,
  image: string,
  caption: string,
  fetcher: typeof fetch = fetch
): Promise<string | null> {
  const kept = image.startsWith('tg:') ? image.slice(3) : null
  let body: FormData | string
  if (kept)
    body = JSON.stringify({
      chat_id: chatId,
      caption: caption.slice(0, 1024),
      parse_mode: 'HTML',
      photo: kept
    })
  else {
    const form = new FormData()
    form.append('chat_id', chatId)
    form.append('caption', caption.slice(0, 1024))
    form.append('parse_mode', 'HTML')
    form.append('photo', imageFile(image), 'topic.jpg')
    body = form
  }
  const response = await fetcher(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    ...(kept ? { headers: { 'content-type': 'application/json' } } : {}),
    body
  })
  const answer = (await response.json().catch(() => ({}))) as {
    description?: string
    result?: { photo?: { file_id: string }[] }
  }
  if (!response.ok) throw new TelegramError(answer.description || `Telegram: ${response.status}`)
  // the largest size of the picture
  return answer.result?.photo?.at(-1)?.file_id ?? null
}

/**
 * The pictures of the posts are kept in a private channel of the bot of the public channel, not in our
 * databases: a picture sent there leaves the id of its file, and the channel gets it by the same id.
 */
export async function storePhoto(
  token: string,
  chatId: string,
  image: string,
  fetcher: typeof fetch = fetch
) {
  const id = await sendPhoto(token, chatId, image, '', fetcher)
  if (!id) throw new TelegramError('Telegram: no file')
  return `tg:${id}`
}

/** The bytes of a picture kept in Telegram (up to 20 MB, as Telegram gives the files to the bots) */
export async function storedPhoto(token: string, image: string, fetcher: typeof fetch = fetch) {
  const file = (await (
    await fetcher(`https://api.telegram.org/bot${token}/getFile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ file_id: image.replace(/^tg:/, '') })
    })
  ).json()) as { result?: { file_path?: string } }
  if (!file.result?.file_path) return null
  return fetcher(`https://api.telegram.org/file/bot${token}/${file.result.file_path}`)
}

/**
 * The private channel the bot of the public channel was added to: found among its updates (a message
 * posted there), not the public channel itself
 */
export async function findStorageChat(token: string, publicChat: string, fetcher: typeof fetch = fetch) {
  const answer = (await (
    await fetcher(`https://api.telegram.org/bot${token}/getUpdates`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ allowed_updates: ['channel_post', 'my_chat_member'] })
    })
  ).json()) as {
    result?: { channel_post?: { chat: ChatOf }; my_chat_member?: { chat: ChatOf } }[]
  }
  const chats = (answer.result ?? [])
    .map((update) => update.channel_post?.chat ?? update.my_chat_member?.chat)
    .filter((chat): chat is ChatOf => Boolean(chat) && chat!.type === 'channel')
    .filter((chat) => String(chat.id) !== publicChat && `@${chat.username ?? ''}` !== publicChat)
  const chat = chats.at(-1)
  return chat ? { id: String(chat.id), title: chat.title ?? String(chat.id) } : null
}

/** "@kcc_bot": the username of a bot, asked of Telegram once and kept a week */
export async function botName(
  token: string,
  store: {
    get(key: string): Promise<string | null>
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  },
  fetcher: typeof fetch = fetch
) {
  const kept = await store.get('settings:channelBotName')
  if (kept) return kept
  const answer = (await (
    await fetcher(`https://api.telegram.org/bot${token}/getMe`)
  )
    .json()
    .catch(() => ({}))) as {
    result?: { username?: string }
  }
  const name = answer.result?.username ? `@${answer.result.username}` : ''
  if (name) await store.put('settings:channelBotName', name, { expirationTtl: 7 * 24 * 60 * 60 })
  return name
}

interface ChatOf {
  id: number
  type: string
  title?: string
  username?: string
}
