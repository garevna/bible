import { describe, expect, it, vi } from 'vitest'

import { parsePost } from './post'
import { formatTopic, sendMessages, TelegramError, toMessages, topicBlocks } from './telegram'

const post = {
  title: 'Прославлення <і> поклоніння',
  items: [
    {
      kind: 'note' as const,
      text: 'Хвала & подяка',
      verses: [{ text: 'Великий Господь', ref: 'Псалми 47:2' }]
    },
    { kind: 'verse' as const, text: 'Книга родоводу', ref: 'Від Матвія 1:1' }
  ]
}

describe('parsePost', () => {
  it('accepts a topic and trims the title', () => {
    expect(parsePost({ ...post, title: '  Тема ' })?.title).toBe('Тема')
  })

  it('rejects what is not a topic', () => {
    expect(parsePost(null)).toBeNull()
    expect(parsePost({ title: '', items: [] })).toBeNull()
    expect(parsePost({ title: 'Тема', items: [{ kind: 'video' }] })).toBeNull()
    expect(parsePost({ title: 'Тема', items: [{ kind: 'note', text: 'без віршів' }] })).toBeNull()
    expect(parsePost({ title: 'x'.repeat(501), items: [] })).toBeNull()
  })
})

describe('formatting for Telegram', () => {
  it('makes a bold title, escaped texts and verses as quotes with their reference', () => {
    expect(topicBlocks(post)).toEqual([
      '<b>Прославлення &lt;і&gt; поклоніння</b>',
      'Хвала &amp; подяка',
      '<blockquote>Великий Господь\n<i>Псалми 47:2</i></blockquote>',
      '<blockquote>Книга родоводу\n<i>Від Матвія 1:1</i></blockquote>'
    ])
    expect(formatTopic(post)).toHaveLength(1)
  })

  it('a note has no title: its text and verses only', () => {
    const note = { title: '', items: [post.items[0]!] }
    expect(parsePost(note)).not.toBeNull()
    expect(formatTopic(note)).toEqual([
      'Хвала &amp; подяка\n\n<blockquote>Великий Господь\n<i>Псалми 47:2</i></blockquote>'
    ])
  })

  it('splits between blocks when a message would be too long', () => {
    const messages = toMessages(['a'.repeat(30), 'b'.repeat(30), 'c'.repeat(30)], 70)
    expect(messages).toEqual(['a'.repeat(30) + '\n\n' + 'b'.repeat(30), 'c'.repeat(30)])
  })

  it('cuts a block longer than a message at spaces, as plain text', () => {
    const long = '<b>' + 'слово '.repeat(40).trim() + '</b>'
    const messages = toMessages([long], 100)
    expect(messages.every((message) => message.length <= 100)).toBe(true)
    expect(messages.join(' ')).toBe('слово '.repeat(40).trim())
  })
})

describe('sendMessages', () => {
  it('sends the messages in order to the channel, as HTML', async () => {
    const fetcher = vi.fn(async () => new Response('{"ok":true}'))
    expect(await sendMessages('TOKEN', '@channel', ['one', 'two'], fetcher as unknown as typeof fetch)).toBe(
      2
    )
    const bodies = fetcher.mock.calls.map((call) =>
      JSON.parse((call as unknown as [string, RequestInit])[1].body as string)
    )
    expect(bodies.map((body) => body.text)).toEqual(['one', 'two'])
    expect(bodies[0]).toMatchObject({ chat_id: '@channel', parse_mode: 'HTML' })
  })

  it('reports the error of Telegram', async () => {
    const fetcher = async () =>
      new Response('{"ok":false,"description":"Bad Request: chat not found"}', { status: 400 })
    await expect(sendMessages('TOKEN', '@nope', ['one'], fetcher as typeof fetch)).rejects.toThrow(
      new TelegramError('Bad Request: chat not found')
    )
  })
})
