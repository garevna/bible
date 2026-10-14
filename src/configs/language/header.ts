import { translationMenuItems } from '../translationMenuItems'

const [ohienko, asv] = [
  translationMenuItems.find((item) => item.value === 'ohienko')!.text,
  translationMenuItems.find((item) => item.value === 'asv')!.text
]

export const header = {
  ohienko,
  asv,

  chirchTitle: {
    ua: 'Харківська християнська церква',
    ru: 'Харьковская христианская церковь',
    en: 'Kharkov Christian Church'
  },

  chirchTitleShort: {
    ua: 'ХХЦ',
    ru: 'ХХЦ',
    en: 'KCC'
  },

  signIn: {
    ua: 'Вхід',
    ru: 'Вход',
    en: 'Sign In'
  },

  signUp: {
    ua: 'Реєстрація',
    ru: 'Регистрация',
    en: 'Sign Up'
  },

  translationMenu: {
    ua: 'Переклад',
    ru: 'Перевод',
    en: 'Translation'
  },

  signOut: {
    ua: 'Вихід',
    ru: 'Выход',
    en: 'Sign Out'
  },
  translationFree: {
    ua: 'Вільний доступ: переклад у суспільному надбанні',
    ru: 'Свободный доступ: перевод в общественном достоянии',
    en: 'Free to use: the translation is in the public domain'
  },
  myPhone: {
    ua: 'Номер мобільного',
    ru: 'Номер мобильного',
    en: 'Mobile number'
  },
  phoneNeeded: {
    ua: 'Служителям потрібен номер мобільного, щоб пастор і адміністратори могли з вами зв’язатися.',
    ru: 'Служителям нужен номер мобильного, чтобы пастор и администраторы могли с вами связаться.',
    en: 'Ministers need a mobile number, so that the pastor and the administrators can reach you.'
  },
  country: {
    ua: 'Країна',
    ru: 'Страна',
    en: 'Country'
  },
  phone: {
    ua: 'Номер',
    ru: 'Номер',
    en: 'Number'
  },
  valid: {
    ua: 'Номер правильний',
    ru: 'Номер правильный',
    en: 'The number is valid'
  },
  invalid: {
    ua: 'Номер неправильний',
    ru: 'Номер неправильный',
    en: 'The number is not valid'
  },
  menu: {
    ua: 'Меню',
    ru: 'Меню',
    en: 'Menu'
  },
  uploadPhoto: {
    ua: 'Завантажити фото',
    ru: 'Загрузить фото',
    en: 'Upload a photo'
  },
  removePhoto: {
    ua: 'Прибрати фото',
    ru: 'Убрать фото',
    en: 'Remove the photo'
  },
  photoFailed: {
    ua: 'Не вдалося відкрити цю картинку',
    ru: 'Не удалось открыть эту картинку',
    en: 'This picture could not be opened'
  },
  telegramLink: {
    ua: 'Підключити Telegram',
    ru: 'Подключить Telegram',
    en: 'Link Telegram'
  },
  telegramLinkHint: {
    ua: 'Запрошення й повідомлення в особистих',
    ru: 'Приглашения и сообщения в личке',
    en: 'Invitations and messages in private'
  },
  telegramLinked: {
    ua: 'Telegram підключено',
    ru: 'Telegram подключен',
    en: 'Telegram is linked'
  },
  telegramUnlink: {
    ua: 'Натисніть, щоб відключити',
    ru: 'Нажмите, чтобы отключить',
    en: 'Click to unlink'
  },
  telegramStart: {
    ua: 'У Telegram натисніть «Start» (Почати) — і готово',
    ru: 'В Telegram нажмите «Start» (Начать) — и готово',
    en: 'Press Start in Telegram, and that is it'
  },
  telegramFailed: {
    ua: 'Не вдалося підключити Telegram, спробуйте пізніше',
    ru: 'Не удалось подключить Telegram, попробуйте позже',
    en: 'Telegram could not be linked, try later'
  }
}
