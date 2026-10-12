import { describe, expect, it } from 'vitest'

import type { TopicItem } from '@/stores/topics'

import { topicPost } from './topicPost'

const verse = (line: number, text: string) => ({
  _id: `1.000.000.00${line}`,
  covenant: 1,
  book: '1.000',
  chapter: '1.000.000',
  line,
  verse: text,
  bookName: 'Від Матвія',
  chapterNum: 1,
  type: 'verse' as const,
  html: ''
})

describe('topicPost', () => {
  it('keeps the order of the page and gives the verses their references', () => {
    const items: TopicItem[] = [
      {
        _id: '1',
        type: 'note',
        text: 'Родовід',
        keywords: ['родовід'],
        topics: ['t'],
        refs: [],
        verses: [verse(0, 'Книга родоводу')]
      },
      verse(1, 'Авраам породив Ісака')
    ]
    expect(topicPost('Родовід Ісуса', items)).toEqual({
      title: 'Родовід Ісуса',
      items: [
        { kind: 'note', text: 'Родовід', verses: [{ text: 'Книга родоводу', ref: 'Від Матвія 1:1' }] },
        { kind: 'verse', text: 'Авраам породив Ісака', ref: 'Від Матвія 1:2' }
      ]
    })
  })
})
