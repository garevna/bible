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
  }
}
