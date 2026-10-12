import type { Localized } from '@/types'

/** short: shown next to the reference of a verse taken from another translation than the chosen one */
export const translationMenuItems: { value: string; text: Localized; short: string; json: string }[] = [
  {
    value: 'ohienko',
    text: {
      ua: 'Переклад І. Огієнка',
      ru: 'Перевод И. Огиенко',
      en: 'Translated by I. Ohienko'
    },
    short: 'Огієнко',
    json: 'bible-ohienko.json'
  },
  {
    value: 'homenko',
    text: {
      ua: 'Українська Біблія в перекладі П.Куліша та І.Пулюя',
      ru: 'Украинская Библия в переводе П.Кулиша та И.Пулюя',
      en: 'Ukrainian Bible translated by P. Kulish and I. Pulyuya'
    },
    short: 'Куліш',
    json: 'bible-homenko.json'
  },
  {
    value: 'synodal',
    text: {
      ua: 'Синодальний переклад (ru)',
      ru: 'Синодальный перевод (ru)',
      en: 'Synodal translation (ru)'
    },
    short: 'Синод.',
    json: 'bible-synodal.json'
  },
  {
    value: 'asv',
    text: {
      ua: 'Американська стандартна версія',
      ru: 'Американская стандартная версия',
      en: 'American Standard Version'
    },
    short: 'ASV',
    json: 'bible-asv.json'
  },
  {
    value: 'kjv',
    text: {
      ua: 'Біблія короля Якова: Чисте Кембриджське видання',
      ru: 'Библия короля Якова: Чистое Кембриджское издание',
      en: 'King James Bible: Pure Cambridge Edition'
    },
    short: 'KJV',
    json: 'bible-kjv.json'
  },
  {
    value: 'web',
    text: {
      ua: 'Всесвітня англійська Біблія',
      ru: 'Всемирная английская Библия',
      en: 'World English Bible'
    },
    short: 'WEB',
    json: 'bible-web.json'
  }
]
