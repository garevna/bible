import type { Localized } from '@/types'

/**
 * short: the abbreviation of the translation, first in the reference of a verse: "(СП, Бытие 1:3)";
 * rights: set when the text may not be used freely: what is wrong and what to do (the menu shows a warning);
 * notice: what the license of a free text asks to show (the menu shows it in the tooltip).
 * Where the texts come from: README, "Тексти Біблії".
 */
export const translationMenuItems: {
  value: string
  text: Localized
  short: string
  json: string
  rights?: Localized
  notice?: Localized
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
    // the old name of the value stays: it is kept in the profiles of the users who chose it
    value: 'homenko',
    text: {
      ua: 'Біблія в перекладі П. Куліша та І. Пулюя (1905)',
      ru: 'Библия в переводе П. Кулиша и И. Пулюя (1905)',
      en: 'Ukrainian Bible translated by P. Kulish and I. Puluj (1905)'
    },
    short: 'Куліш',
    json: 'bible-kulish.json'
  },
  {
    value: 'npu',
    text: {
      ua: 'Новий Переклад Українською (Новий Завіт і Псалми)',
      ru: 'Новый перевод на украинский (Новый Завет и Псалмы)',
      en: 'New Ukrainian Translation (New Testament and Psalms)'
    },
    short: 'НПУ',
    json: 'bible-npu.json',
    // CC BY-SA 4.0: the notice of the rights holder goes with the text
    notice: {
      ua: 'Новий Завіт і Книга Псалмів, Бібліка® Відкрита Новий Переклад Українською™ © 2022 Biblica, Inc. Ліцензія CC BY-SA 4.0. Оригінал безкоштовно доступний на www.biblica.com і open.bible.',
      ru: 'Новый Завет и Книга Псалмов, Бібліка® Відкрита Новий Переклад Українською™ © 2022 Biblica, Inc. Лицензия CC BY-SA 4.0. Оригинал бесплатно доступен на www.biblica.com и open.bible.',
      en: 'New Testament and Psalms, Biblica® Open New Ukrainian Translation™ © 2022 Biblica, Inc. License CC BY-SA 4.0. The original work is available for free at www.biblica.com and open.bible.'
    }
  },
  {
    value: 'synodal',
    text: {
      ua: 'Синодальний переклад (ru)',
      ru: 'Синодальный перевод (ru)',
      en: 'Synodal translation (ru)'
    },
    short: 'СП',
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
