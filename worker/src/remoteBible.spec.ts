import { describe, expect, it } from 'vitest'

import { versesOfChapter } from './remoteBible'

describe('the verses of a chapter read online', () => {
  it('a verse begins at its mark; the numbers, the tags and the lines of a poem go', () => {
    // as the YouVersion Platform gives Psalm 3 of the New Russian Translation
    const html =
      '<div><div class="d"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Псалом Давида.</div>' +
      '<div class="q1"><span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>Господи, как много стало у меня врагов!</div>' +
      '<div class="q2">Как много тех, кто поднимается против меня!</div>' +
      '<div class="q1"><span class="yv-v" v="3"></span><span class="yv-vlbl">3</span>Многие говорят: ' +
      '<span class="add">Бог</span> &quot;его&quot; не спасет. <span class="qs">Пауза</span></div></div>'
    expect(versesOfChapter(html)).toEqual([
      'Псалом Давида.',
      'Господи, как много стало у меня врагов! Как много тех, кто поднимается против меня!',
      'Многие говорят: Бог "его" не спасет. Пауза'
    ])
  })

  it('verses on one line of the text are verses of their own', () => {
    const html =
      '<div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Первый, ' +
      '<span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>второй.</div>'
    expect(versesOfChapter(html)).toEqual(['Первый,', 'второй.'])
  })
})
