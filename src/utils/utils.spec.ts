import { describe, expect, it } from 'vitest'

import { pushUnique, removeById } from './array'
import { clearHighlights, getHTML, updateIntervals } from './highlights'
import { chapterOf, getLineRef, parseLineRef } from './refs'
import { loginEmail, sha256Hex } from './loginEmail'
import { markWords, normalize, queryWords } from './search'

describe('refs', () => {
  it('builds and parses line refs', () => {
    const ref = getLineRef(1, 4, 2, 10)
    expect(ref).toBe('1.004.002.010')
    expect(parseLineRef(ref)).toEqual([1, 4, 2, 10])
    expect(chapterOf(ref)).toBe('1.004.002')
  })
})

describe('array helpers', () => {
  it('pushUnique skips duplicates of strings and records', () => {
    const ids = ['a']
    pushUnique(ids, 'a')
    pushUnique(ids, 'b')
    expect(ids).toEqual(['a', 'b'])

    const records = [{ _id: '1' }]
    pushUnique(records, { _id: '1' })
    expect(records).toHaveLength(1)
  })

  it('removeById removes strings and records', () => {
    const ids = ['a', 'b']
    removeById(ids, 'a')
    expect(ids).toEqual(['b'])

    const records = [{ _id: '1' }, { _id: '2' }]
    removeById(records, '2')
    expect(records).toEqual([{ _id: '1' }])
  })
})

describe('highlights', () => {
  const red = '#f00'
  const blue = '#00f'

  it('splits an interval covered by another color', () => {
    const result = updateIntervals([{ start: 0, end: 10, color: red }], { start: 3, end: 5, color: blue })
    expect(result).toEqual([
      { start: 0, end: 2, color: red },
      { start: 3, end: 5, color: blue },
      { start: 6, end: 10, color: red }
    ])
  })

  it('extends an interval of the same color', () => {
    const result = updateIntervals([{ start: 0, end: 4, color: red }], { start: 3, end: 8, color: red })
    expect(result).toEqual([{ start: 0, end: 8, color: red }])
  })

  it('merges adjacent intervals of the same color', () => {
    const result = clearHighlights([
      { start: 0, end: 2, color: red },
      { start: 3, end: 5, color: red }
    ])
    expect(result).toEqual([{ start: 0, end: 5, color: red }])
  })

  it('renders highlighted fragments and escapes the text', () => {
    expect(getHTML({ verse: 'a <b> c', colored: [{ start: 2, end: 4, color: red }] })).toBe(
      `a <span style="background: ${red}">&lt;b&gt;</span> c`
    )
    expect(getHTML({ verse: 'text' })).toBe('')
  })
})

describe('search', () => {
  it('normalizes case, apostrophes, ё and punctuation', () => {
    expect(normalize('Сім’я, ЇЖАК! Ёлка')).toBe('сімя їжак елка')
    expect(queryWords('  сина Давидового сина ')).toEqual(['давидового', 'сина'])
  })

  it('marks words regardless of case and apostrophes', () => {
    expect(markWords('Сім’я Давида', ['сімя'])).toBe('<mark>Сім’я</mark> Давида')
    expect(markWords('Сина Давидового, Сина', ['сина'])).toBe(
      '<mark>Сина</mark> Давидового, <mark>Сина</mark>'
    )
    expect(markWords('a <b>', [])).toBe('a &lt;b&gt;')
  })
})

describe('login email', () => {
  it('hashes like sha256', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('makes a stable valid email for any login', async () => {
    const email = await loginEmail('Ірина Ф.', 'bible.firebaseapp.com')
    expect(email).toMatch(/^l[0-9a-f]{40}@bible\.firebaseapp\.com$/)
    expect(await loginEmail('Ірина Ф.', 'bible.firebaseapp.com')).toBe(email)
    expect(await loginEmail('ірина ф.', 'bible.firebaseapp.com')).not.toBe(email)
  })
})
