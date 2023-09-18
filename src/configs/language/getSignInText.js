const signInTexts = {
  title: {
    ua: 'Вхід',
    ru: 'Вход',
    en: 'Sign In'
  },
  loginLabel: {
    ua: 'Логін',
    ru: 'Логин',
    en: 'Login'
  },
  passwordLabel: {
    ua: 'Пароль',
    ru: 'Пароль',
    en: 'Password'
  },
  registrationButtonText: {
    ua: 'Реєстрація',
    ru: 'Регистрация',
    en: 'Sign Up'
  },
  returnButtonText: {
    ua: 'Повернутися',
    ru: 'Назад',
    en: 'Back'
  },
  loginErrorMessage: {
    ua: 'Користувач не знайдений',
    ru: 'Такой пользователь не существует',
    en: 'User does not exist'
  },
  passwordErrorMessage: {
    ua: 'Невірний пароль',
    ru: 'Неверный пароль',
    en: 'Invalid password'
  }
}

export const getSignInText = (lang = 'ua', prop = 'title') => signInTexts[prop] ? signInTexts[prop][lang] : ''
