import type { Lang, Localized } from '@/types'

import uaFlag from '@/assets/ua-flag.svg'
import ukFlag from '@/assets/uk-flag.png'
import ruIcon from '@/assets/ru-language-icon.svg'

export const langMenuItems: { value: Lang; text: Localized; icon: string }[] = [
  {
    value: 'ua',
    text: { ua: 'українська', ru: 'украинский', en: 'ukrainian' },
    icon: uaFlag
  },
  {
    value: 'en',
    text: { ua: 'англійська', ru: 'английский', en: 'english' },
    icon: ukFlag
  },
  {
    value: 'ru',
    text: { ua: 'російська', ru: 'русский', en: 'russian' },
    icon: ruIcon
  }
]
