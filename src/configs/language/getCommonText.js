const strings = {
  buttonBack: {
    ua: 'Повернутися',
    ru: 'Назад',
    en: 'Back'
  },
  buttonNext: {
    ua: 'Далі',
    ru: 'Далее',
    en: 'Next'
  }
}

export const getCommonText = (lang = 'ua', prop = '') => strings[prop] ? strings[prop][lang] : ''
