import type { Localized } from '@/types'

/**
 * short: shown next to the reference of a verse taken from another translation than the chosen one;
 * rights: set when the text may not be used freely: what is wrong and what to do (the menu shows a warning)
 */
export const translationMenuItems: {
  value: string
  text: Localized
  short: string
  json: string
  rights?: Localized
}[] = [
  {
    value: 'ohienko',
    text: {
      ua: 'Переклад І. Огієнка',
      ru: 'Перевод И. Огиенко',
      en: 'Translated by I. Ohienko'
    },
    short: 'Огієнко',
    json: 'bible-ohienko.json',
    rights: {
      ua: 'Переклад під авторським правом (І. Огієнко помер 1972 р., охорона триває приблизно до 2042 р.). Перед широким показом застосунку попросіть дозволу в правовласника (ймовірно, Українського біблійного товариства) або приберіть цей переклад.',
      ru: 'Перевод под авторским правом (И. Огиенко умер в 1972 г., охрана длится примерно до 2042 г.). Перед широким показом приложения попросите разрешения у правообладателя (вероятно, Украинского библейского общества) или уберите этот перевод.',
      en: 'The translation is under copyright (I. Ohienko died in 1972, the protection lasts until about 2042). Before showing the app widely, ask the rights holder (probably the Ukrainian Bible Society) for permission or remove this translation.'
    }
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
