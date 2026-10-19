import type { Page } from '@/types'

export interface FooterMenuItem {
  icon: string
  value: Page
  component: string
  /** footer item that stays highlighted while this page is open */
  menu: Page
}

export const footerMenu: FooterMenuItem[] = [
  { icon: '$bible', value: 'bible', component: 'Home', menu: 'bible' },
  { icon: '$notes', value: 'notes', component: 'Notes', menu: 'notes' },
  { icon: '$keywords', value: 'keywords', component: 'Keywords', menu: 'keywords' },
  { icon: '$topics', value: 'topics', component: 'Topics', menu: 'topics' },
  { icon: '$search', value: 'search', component: 'Search', menu: 'search' },
  { icon: '', value: 'topic', component: 'Topic', menu: 'topics' },
  // opened from the header, administrators only
  { icon: '', value: 'admin', component: 'Admin', menu: 'admin' },
  // opened from the header, ministers only
  { icon: '', value: 'messages', component: 'Messages', menu: 'messages' },
  // ministers: the first page they see
  { icon: '', value: 'calendar', component: 'Calendar', menu: 'calendar' }
]
