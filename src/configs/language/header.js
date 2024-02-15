import { translationMenuItems } from '@/configs/translationMenuItems'

const [ohienko, asv] = [
  translationMenuItems.find(item => item.value === 'ohienko').text,
  translationMenuItems.find(item => item.value === 'asv').text
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

  signOut: {
    ua: 'Вихід',
    ru: 'Выход',
    en: 'Sign Out'
  }
}
