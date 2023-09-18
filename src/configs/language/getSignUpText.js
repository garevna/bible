const signUpTexts = {
  title: {
    ua: 'Реєстрація',
    ru: 'Регистрация',
    en: 'Sign Up'
  },
  userNameLabel: {
    ua: 'Як до вас краще звертатися?',
    ru: 'Как к вам лучше обращаться?',
    en: 'What is the best way to name you?'
  },
  loginLabel: {
    ua: 'Логін',
    ru: 'Логин',
    en: 'Login'
  },
  passwordLabel: {
    ua: 'Придумайте пароль',
    ru: 'Придумайте пароль',
    en: 'Make up a password'
  },
  doublePasswordLabel: {
    ua: 'Повторіть, будь ласка, пароль ще раз',
    ru: 'Повторите, пожалуйста, пароль еще раз',
    en: 'Please repeat the password once more'
  },
  registrationButtonText: {
    ua: 'Реєстрація',
    ru: 'Регистрация',
    en: 'Sign Up'
  },
  back: {
    ua: 'Повернутися',
    ru: 'Назад',
    en: 'Back'
  },
  next: {
    ua: 'Далі',
    ru: 'Далее',
    en: 'Next'
  },
  loginErrorMessage: {
    ua: 'Цей логін уже існує',
    ru: 'Логин уже используется',
    en: 'Login is in use'
  },
  passwordErrorMessage: {
    ua: 'Помилка. Паролі не збігаються',
    ru: 'Ошибка. Пароли не совпадают',
    en: 'Error. Passwords do not match'
  }
}

export const getSignUpText = (lang = 'ua', prop = 'title') => signUpTexts[prop] ? signUpTexts[prop][lang] : ''
