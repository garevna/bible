import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { translationMenuItems } from '@/configs'

type BibleJSON = { title: string; books: { title: string; chapters: string[][] }[] }[]

/** The app shows the number of a verse itself, so the texts must not start with it */
describe('translations', () => {
  it.each(translationMenuItems.map((item) => item.json))('%s has no verse numbers in the texts', (json) => {
    const bible: BibleJSON = JSON.parse(readFileSync(`public/${json}`, 'utf8'))
    const numbered = bible.flatMap(({ books }) =>
      books.flatMap(({ title, chapters }) =>
        chapters.flatMap((verses, chapter) =>
          verses.flatMap((verse, line) =>
            verse.startsWith(`${line + 1} `) ? [`${title} ${chapter + 1}:${line + 1}`] : []
          )
        )
      )
    )
    expect(numbered.slice(0, 5)).toEqual([])
  })
})
