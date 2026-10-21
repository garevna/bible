import { translationMenuItems } from '../translationMenuItems'

const [ohienko, asv] = [
  translationMenuItems.find((item) => item.value === 'ohienko')!.text,
  translationMenuItems.find((item) => item.value === 'asv')!.text
]

export const header = {
  installTitleDesktop: {
    ua: 'Встановити на комп’ютер',
    ru: 'Установить на компьютер',
    en: 'Install on the computer'
  },
  installLeadDesktop: {
    ua: 'Застосунок можна встановити на комп’ютер, як звичайну програму: він відкриватиметься в окремому вікні, його можна закріпити на панелі завдань або винести на робочий стіл.',
    ru: 'Приложение можно установить на компьютер как обычную программу: оно будет открываться в отдельном окне, его можно закрепить на панели задач или вынести на рабочий стол.',
    en: 'Install the app on the computer like any program: it opens in a window of its own, and can be pinned to the taskbar or put on the desktop.'
  },
  installMenuDesktop: {
    ua: 'Праворуч в адресному рядку натисніть значок встановлення (монітор зі стрілкою) або відкрийте меню браузера (три крапки)',
    ru: 'Справа в адресной строке нажмите значок установки (монитор со стрелкой) или откройте меню браузера (три точки)',
    en: 'At the right of the address bar click the install icon (a screen with an arrow), or open the menu of the browser (three dots)'
  },
  installMenuItemDesktop: {
    ua: 'Виберіть «Встановити ХХЦ» (у Edge: «Програми» → «Установити цей сайт як програму»)',
    ru: 'Выберите «Установить ХХЦ» (в Edge: «Приложения» → «Установить этот сайт как приложение»)',
    en: 'Choose “Install ХХЦ” (in Edge: “Apps” → “Install this site as an app”)'
  },
  installMacFile: {
    ua: 'У меню «Файл» вгорі екрана виберіть «Додати в Dock»',
    ru: 'В меню «Файл» вверху экрана выберите «Добавить в Dock»',
    en: 'In the menu “File” at the top of the screen choose “Add to Dock”'
  },
  installFirefox: {
    ua: 'Firefox на комп’ютері не вміє встановлювати застосунки. Відкрийте kcc-bible.pp.ua у Chrome або Edge і натисніть там «Встановити на комп’ютер».',
    ru: 'Firefox на компьютере не умеет устанавливать приложения. Откройте kcc-bible.pp.ua в Chrome или Edge и нажмите там «Установить на компьютер».',
    en: 'Firefox on a computer does not install apps. Open kcc-bible.pp.ua in Chrome or Edge and choose “Install on the computer” there.'
  },
  installAfterDesktop: {
    ua: 'Після встановлення застосунок «ХХЦ» з’явиться в меню «Пуск» (на Mac — у Launchpad), і ви залишитеся в ньому з тим самим акаунтом. Ярлик можна закріпити на панелі завдань або перетягти на робочий стіл.',
    ru: 'После установки приложение «ХХЦ» появится в меню «Пуск» (на Mac — в Launchpad), и вы останетесь в нём с тем же аккаунтом. Ярлык можно закрепить на панели задач или перетащить на рабочий стол.',
    en: 'After installing, “ХХЦ” is in the Start menu (Launchpad on a Mac), signed in with the same account. Pin it to the taskbar or drag it to the desktop.'
  },
  installTitle: {
    ua: 'Встановити на телефон',
    ru: 'Установить на телефон',
    en: 'Install on the phone'
  },
  installLead: {
    ua: 'Застосунок можна поставити на телефон, як звичайну програму: на екрані з’явиться значок, і застосунок відкриватиметься одним дотиком, навіть без інтернету.',
    ru: 'Приложение можно поставить на телефон как обычную программу: на экране появится значок, и приложение будет открываться одним касанием, даже без интернета.',
    en: 'Put the app on the phone like any app: an icon appears on the screen, and the app opens with one tap, even offline.'
  },
  installButton: {
    ua: 'Встановити',
    ru: 'Установить',
    en: 'Install'
  },
  installAppleShare: {
    ua: 'Унизу екрана в Safari натисніть кнопку «Поділитися»',
    ru: 'Внизу экрана в Safari нажмите кнопку «Поделиться»',
    en: 'At the bottom of Safari, tap “Share”'
  },
  installAppleHome: {
    ua: 'Прогорніть і виберіть «На початковий екран»',
    ru: 'Пролистайте и выберите «На экран “Домой”»',
    en: 'Scroll and choose “Add to Home Screen”'
  },
  installAppleAdd: {
    ua: 'Натисніть «Додати» вгорі праворуч',
    ru: 'Нажмите «Добавить» вверху справа',
    en: 'Tap “Add” at the top right'
  },
  installMenu: {
    ua: 'Відкрийте меню браузера (три крапки вгорі праворуч)',
    ru: 'Откройте меню браузера (три точки вверху справа)',
    en: 'Open the menu of the browser (three dots at the top right)'
  },
  installMenuItem: {
    ua: 'Виберіть «Встановити застосунок» або «Додати на головний екран»',
    ru: 'Выберите «Установить приложение» или «Добавить на главный экран»',
    en: 'Choose “Install app” or “Add to Home screen”'
  },
  installSignedIn: {
    ua: 'Після встановлення ви залишитеся в застосунку з тим самим акаунтом. На iPhone першого разу, можливо, доведеться увійти ще раз — далі вхід буде автоматичним.',
    ru: 'После установки вы останетесь в приложении с тем же аккаунтом. На iPhone в первый раз, возможно, придётся войти ещё раз — дальше вход будет автоматическим.',
    en: 'After installing you stay signed in with the same account. On an iPhone you may need to sign in once more the first time; then it is automatic.'
  },
  requestTitle: {
    ua: 'Стати служителем',
    ru: 'Стать служителем',
    en: 'Become a servant'
  },
  requestLead: {
    ua: 'Зараз ви читач: вам доступні Біблія, нотатки і теми. Якщо ви служите в церкві, надішліть запит — адміністратор надасть вам статус служителя.',
    ru: 'Сейчас вы читатель: вам доступны Библия, заметки и темы. Если вы служите в церкви, отправьте запрос — администратор даст вам статус служителя.',
    en: 'You are a reader now: the Bible, notes and topics. If you serve in the church, send a request: an administrator will give you the status of a servant.'
  },
  requestNote: {
    ua: 'Де ви служите (необов’язково)',
    ru: 'Где вы служите (необязательно)',
    en: 'Where you serve (optional)'
  },
  requestNoteExample: {
    ua: 'Наприклад: музичне служіння',
    ru: 'Например: музыкальное служение',
    en: 'For example: the music ministry'
  },
  requestSend: {
    ua: 'Надіслати запит',
    ru: 'Отправить запрос',
    en: 'Send the request'
  },
  requestLater: {
    ua: 'Пізніше',
    ru: 'Позже',
    en: 'Later'
  },
  requestSent: {
    ua: 'Запит надіслано. Коли адміністратор змінить ваш статус, застосунок вам про це скаже.',
    ru: 'Запрос отправлен. Когда администратор изменит ваш статус, приложение вам об этом скажет.',
    en: 'The request is sent. When an administrator changes your status, the app will tell you.'
  },
  requestFailed: {
    ua: 'Не вдалося надіслати запит. Спробуйте ще раз.',
    ru: 'Не удалось отправить запрос. Попробуйте ещё раз.',
    en: 'The request was not sent. Please try again.'
  },
  requestWaiting: {
    ua: 'Запит надіслано',
    ru: 'Запрос отправлен',
    en: 'Request sent'
  },
  grantedTitle: {
    ua: 'Вітаємо!',
    ru: 'Поздравляем!',
    en: 'Congratulations!'
  },
  grantedStatus: {
    ua: 'Ваш статус у застосунку змінено. Тепер ви — {name}.',
    ru: 'Ваш статус в приложении изменён. Теперь вы — {name}.',
    en: 'Your status in the app has changed. You are now: {name}.'
  },
  grantedNext: {
    ua: 'Щоб отримувати запрошення на служіння:',
    ru: 'Чтобы получать приглашения на служение:',
    en: 'To get the invitations to serve:'
  },
  grantedChannel: {
    ua: 'Приєднайтеся до каналу служителів у Telegram.',
    ru: 'Присоединитесь к каналу служителей в Telegram.',
    en: 'Join the channel of the servants in Telegram.'
  },
  grantedJoin: {
    ua: 'Приєднатися до каналу',
    ru: 'Присоединиться к каналу',
    en: 'Join the channel'
  },
  grantedBot: {
    ua: 'Підключіть Telegram: бот надсилатиме вам запрошення особисто.',
    ru: 'Подключите Telegram: бот будет присылать вам приглашения лично.',
    en: 'Link Telegram: the bot will send you the invitations in private.'
  },
  grantedOk: {
    ua: 'Зрозуміло',
    ru: 'Понятно',
    en: 'Got it'
  },
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
  changePhoto: {
    ua: 'Змінити фото',
    ru: 'Сменить фото',
    en: 'Change the photo'
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
