import { admin } from './admin'
import { common } from './common'
import { header } from './header'
import { keywords } from './keywords'
import { nestedDraggable } from './nestedDraggable'
import { notes } from './notes'
import { pages } from './pages'
import { publish } from './publish'
import { search } from './search'
import { selector } from './selector'
import { showControls } from './showControls'
import { signIn } from './signIn'
import { signUp } from './signUp'
import { topics } from './topics'

export const languages = {
  admin,
  common,
  header,
  keywords,
  nestedDraggable,
  notes,
  pages,
  publish,
  search,
  selector,
  showControls,
  signIn,
  signUp,
  topics
}

export type Languages = typeof languages
