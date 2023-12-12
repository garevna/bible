const strings = {
  translation: {
    ua: 'Переклад І. Огієнка',
    ru: '',
    en: ''
  },
  churchFull: {
    ua: 'Харківська християнська церква',
    ru: 'Харьковская христанская церковь',
    en: 'Kharkov Christian Church'
  },
  churchShort: {
    ua: 'ХХЦ',
    ru: 'ХХЦ',
    en: 'KCC'
  }
}

export const getHeaderText = (lang = 'ua', prop = '') => strings[prop] ? strings[prop][lang] : ''
