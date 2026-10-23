import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

import { useSwipeTabs } from '@/composables/useSwipeTabs'

describe('useSwipeTabs', () => {
  it('a swipe to the left: the next tab; to the right: the one before; none past the ends', () => {
    const tab = ref<'a' | 'b' | 'c'>('a')
    const swipe = useSwipeTabs(tab, () => ['a', 'b', 'c'])
    swipe.right()
    expect(tab.value).toBe('a')
    swipe.left()
    swipe.left()
    expect(tab.value).toBe('c')
    swipe.left()
    expect(tab.value).toBe('c')
    swipe.right()
    expect(tab.value).toBe('b')
  })

  it('the tabs the user has only; nothing while the swipe belongs to the content', () => {
    const tab = ref<'mine' | 'approve' | 'tasks'>('mine')
    const off = ref(false)
    const swipe = useSwipeTabs(
      tab,
      () => ['mine', 'tasks'],
      () => off.value
    )
    swipe.left()
    expect(tab.value).toBe('tasks')
    off.value = true
    swipe.right()
    expect(tab.value).toBe('tasks')
  })
})
