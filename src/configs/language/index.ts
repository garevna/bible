import { admin } from './admin'
import { calendar } from './calendar'
import { common } from './common'
import { groups } from './groups'
import { header } from './header'
import { keywords } from './keywords'
import { messages } from './messages'
import { nestedDraggable } from './nestedDraggable'
import { notes } from './notes'
import { pages } from './pages'
import { posts } from './posts'
import { publish } from './publish'
import { search } from './search'
import { selector } from './selector'
import { showControls } from './showControls'
import { signIn } from './signIn'
import { signUp } from './signUp'
import { topics } from './topics'

export const languages = {
  admin,
  calendar,
  common,
  groups,
  header,
  keywords,
  messages,
  nestedDraggable,
  notes,
  pages,
  posts,
  publish,
  search,
  selector,
  showControls,
  signIn,
  signUp,
  topics
}

export type Languages = typeof languages
