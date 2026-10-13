# Bible

Читання Біблії з нотатками, темами, ключовими словами та виділенням тексту.
Vue 3 + TypeScript + Pinia + Vuetify 3, збірка Vite, PWA.

Це перенесення застосунку `bible-ukr` (Vue 2 + Vuex + Vuetify 2).

## Запуск

Потрібен Node `^22.22.2` або `>=24.15` (див. `.node-version`).

```sh
corepack enable pnpm          # версія pnpm береться з packageManager у package.json
pnpm install
cp .env.example .env.local   # ключі Firebase та функції шифрування сесії
pnpm dev
```

| Команда          | Що робить                          |
| ---------------- | ---------------------------------- |
| `pnpm dev`       | dev-сервер                         |
| `pnpm build`     | перевірка типів і збірка в `dist/` |
| `pnpm preview`   | перегляд зібраної версії           |
| `pnpm lint`      | ESLint                             |
| `pnpm test`      | unit-тести (Vitest)                |
| `pnpm test:e2e`  | e2e-тести (Playwright)             |
| `pnpm typecheck` | vue-tsc                            |

Шлях сайту задає `BASE_PATH` під час збірки: `/bible/` на `garevna.github.io` (за замовчуванням у CI), `/` на власному домені. Деплой на GitHub Pages — автоматично з гілки `main` (`.github/workflows/ci.yml`).

## Firebase

Вхід — через Firebase Auth: email і пароль або Google. Підтвердження email не вимагається.
Дані користувача лежать у `users/{uid}` і доступні лише йому (правила — у `firestore.rules`).

Користувачі версії на Vue 2 входять своїм старим логіном і паролем: скрипт міграції створює
їм обліковий запис із технічним email `l<sha256(логін)>@<authDomain>` (`src/utils/loginEmail.ts`)
і переносить їхні дані з `users/{login}` до `users/{uid}`.

Налаштування проєкту (один раз):

1. Firebase console → Authentication → Sign-in method → увімкнути **Email/Password** і **Google**.
2. Authentication → Settings → Authorized domains → додати домен сайту (наприклад, `<user>.github.io`).
3. Розгорнути правила: `pnpm dlx firebase-tools deploy --only firestore:rules --project <project-id>`.
4. Перенести наявних користувачів (паролі зберігаються):

   ```sh
   # ключ: Project settings → Service accounts → Generate new private key (не додавати в git)
   node scripts/migrate-users-to-auth.ts --key key.json                  # перегляд без змін
   node scripts/migrate-users-to-auth.ts --key key.json --apply          # імпорт і копіювання даних
   node scripts/migrate-users-to-auth.ts --key key.json --check <логін>  # перевірити вхід
   node scripts/migrate-users-to-auth.ts --key key.json --delete-legacy  # прибрати старі документи
   ```

   Якщо `--check` не проходить, `--undo` повертає все як було до `--apply`
   (поки не виконано `--delete-legacy`).

## Деплой: GitHub Pages і власний домен

Кожен пуш у `main` (після перевірок) публікує застосунок двічі, незалежно:

| Адреса                                                      | Де                                                    |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| [garevna.github.io/bible](https://garevna.github.io/bible/) | GitHub Pages, job `deploy` (`BASE_PATH=/bible/`)      |
| [kcc-bible.pp.ua](https://kcc-bible.pp.ua/)                 | Cloudflare Pages, job `deploy-domain` (`BASE_PATH=/`) |
| [kcc-bible.pages.dev](https://kcc-bible.pages.dev/)         | той самий проєкт Cloudflare Pages (`kcc-bible`)       |

Якщо домен «відвалиться», GitHub Pages працює далі: це окремий сайт, без переспрямування на домен.

Що потрібно один раз:

1. Домен у Cloudflare: cloudflare.com > Add a domain > `kcc-bible.pp.ua` (Free), і в панелі
   реєстратора (nic.ua) замінити DNS-сервери на два, які дасть Cloudflare.
2. Cloudflare > Workers & Pages > `kcc-bible` > Custom domains: додати `kcc-bible.pp.ua`
   (і, за бажання, `www.kcc-bible.pp.ua`).
3. API-токен Cloudflare (My Profile > API Tokens > Create Token > Custom: Account · Cloudflare Pages · Edit)
   — секрет репозиторію `CLOUDFLARE_API_TOKEN` (GitHub > Settings > Secrets and variables > Actions > Secrets).
   Змінна `CLOUDFLARE_ACCOUNT_ID` уже задана. Поки токена немає, `deploy-domain` пропускається.
4. Firebase console > Authentication > Settings > Authorized domains: `kcc-bible.pp.ua`
   (і `kcc-bible.pages.dev`) — для входу через Google.

Адреси сайту дозволені й у worker (`ALLOWED_ORIGINS` у `worker/wrangler.toml`).

## E2E-тести

Тести в `e2e/` запускаються на production-збірці (`vite build` + `vite preview` на порту 4179).
Локально використовується встановлений Microsoft Edge, нічого завантажувати не треба.
Щоб запустити в Chromium: `pnpm exec playwright install chromium` і `PW_CHANNEL=chromium`.

Тести працюють офлайн: усі запити поза локальним сервером блокуються, тому
в справжній Firestore нічого не потрапляє. Користувач «входить» лише в пам'яті сторінки
(`signInLocally` у `e2e/fixtures.ts`).

## Ролі, адміністрування і публікація в Telegram

Токен бота і ролі не можна тримати в коді сайту, тому є маленький сервер — Cloudflare Worker
у `worker/` (безкоштовний тариф). Він перевіряє Firebase-токен користувача і знає його роль.

Ролі:

- **читач** — користується застосунком (кожен, хто увійшов);
- **публікатор** — ще й публікує теми в Telegram (у режимі редагування теми кнопка
  «Опублікувати в Telegram», спершу — як виглядатиме пост);
- **адміністратор** — ще й призначає ролі на сторінці «Адміністрування» (іконка щита в шапці).

Хто увійшов у застосунок хоч раз, той є в списку на сторінці «Адміністрування»; там адміністратор
вибирає роль або прибирає людину зі списку. Ролі зберігаються в Cloudflare KV (`USERS`), не у Firebase,
тож доступ до Firebase-акаунта для цього не потрібен.

**Власники** (`OWNERS` у налаштуваннях сервера) — адміністратори, яких зі сторінки змінити не можна,
тож ніхто не позбавить їх доступу. Також адміністратор не може змінити власну роль. `OWNERS` — Firebase
user id (Firebase console > Authentication) або email Google-акаунта, через кому. Email із реєстрації
за паролем тут не підходить: застосунок не перевіряє пошту, тож такий email міг би вказати будь-хто.

**Тимчасовий адміністратор** (наприклад, для пастора на старті): зареєструвати звичайний акаунт
email + пароль, увійти ним раз, на сторінці «Адміністрування» дати йому роль адміністратора і передати
логін і пароль. Коли з'являться справжні адміністратори — прибрати цей акаунт зі списку.

### Служіння і повідомлення між служителями

Адміністратор веде список служінь («Лідер домашньої групи», «Музичне служіння», …) і дає людям служіння
на сторінці «Адміністрування» (поруч із роллю; одна людина може бути в кількох служіннях).

- Публікатори й адміністратори (пастор, проповідники) пишуть окремим людям або всім учасникам служіння
  й можуть вкласти нотатку чи тему (кнопка «Надіслати служителям» на картці нотатки й на сторінці теми).
- Учасники служінь лише відповідають на отримані повідомлення; першими писати пасторові вони не можуть.
  Звичайні читачі повідомлень не мають.
- Отриману нотатку чи тему можна зберегти собі (з віршами).
- Повідомлення лежать у Cloudflare D1 (`bible-messages`, схема — `worker/migrations`) одну добу:
  щодня о 03:00 (UTC) старі видаляються. Обмеження — 100 повідомлень на годину від однієї людини.
- Конверт у шапці показує кількість непрочитаних (застосунок питає про них раз на хвилину).

Нова міграція бази: `pnpm --filter bible-worker exec wrangler d1 migrations apply bible-messages --remote`.

### Канал і бот

1. Бот створюється в @BotFather, його токен — секрет (не надсилайте його в чати і не комітьте).
2. Бот додається в канал адміністратором із правом публікувати повідомлення.
3. `TELEGRAM_CHAT_ID` — `@назва` публічного каналу або id приватного (`-100…`).
   Id можна дізнатися так: опублікувати будь-що в каналі й виконати `pnpm worker:chat-id`
   (скрипт бере токен з `worker/.dev.vars`).

Для перевірок — окремі тестовий бот і тестовий канал, щоб нічого не потрапило в справжній канал.

### Локально

1. `worker/.dev.vars` (не комітиться, зразок — `worker/.dev.vars.example`):
   `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `OWNERS`.
2. `pnpm worker:dev` — сервер на `http://localhost:8787`.
3. У `.env.local`: `VITE_WORKER_URL=http://localhost:8787`, потім `pnpm dev`.

### На Cloudflare

Сервер уже розгорнуто: `https://bible-worker.garevna.workers.dev` (акаунт Cloudflare, вхід через GitHub).

1. `pnpm --filter bible-worker exec wrangler login` — один раз, відкриється браузер.
2. `pnpm worker:secrets` — заповнені `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` і `OWNERS` з
   `worker/.dev.vars` потрапляють у секрети Cloudflare (значення ніде не друкуються).
3. `pnpm worker:deploy` — після змін у `worker/`.
4. Адреса сервера — змінна репозиторію `VITE_WORKER_URL` (GitHub > Settings > Secrets and variables >
   Actions > Variables); з нею кнопка публікації є на сайті після деплою.

## Структура

```text
src/
  configs/      меню, переклади, тексти інтерфейсу (configs/language)
  db/           IndexedDB: схема і хелпери
  stores/       Pinia: app, content, user, firebase, notes, topics, keywords, language
  components/   UI
  views/        сторінки (перемикаються через app.page, без роутера)
  utils/        чисті функції (рефи віршів, інтервали виділень)
public/         bible-*.json — тексти перекладів
worker/         Cloudflare Worker: публікація в Telegram
```

## Тексти інтерфейсу (переклади)

Усі написи інтерфейсу лежать у `src/configs/language/`, по файлу на розділ:

| Файл                 | Що там                                                  |
| -------------------- | ------------------------------------------------------- |
| `common.ts`          | загальні кнопки й повідомлення (Скасувати, Зберегти, …) |
| `header.ts`          | шапка: назва церкви, меню мови й перекладу              |
| `pages.ts`           | назви сторінок у плашці й нижньому меню                 |
| `signIn.ts`          | вхід, скидання пароля, помилки входу                    |
| `signUp.ts`          | реєстрація                                              |
| `notes.ts`           | нотатки, редактор нотатки, вибір віршів                 |
| `topics.ts`          | теми                                                    |
| `keywords.ts`        | ключові слова                                           |
| `search.ts`          | повнотекстовий пошук                                    |
| `selector.ts`        | поля вибору й фільтри нотаток                           |
| `nestedDraggable.ts` | сторінка теми з перетягуванням                          |
| `showControls.ts`    | перемикач «показати/сховати керування»                  |

Кожен напис має три мови:

```ts
saveButton: {
  ua: 'Зберегти',
  ru: 'Сохранить',
  en: 'Save'
}
```

`{name}`, `{count}` у тексті підставляються під час показу — їх треба залишати як є.
Новий напис додається в потрібний файл і стає доступним у компонентах через
`useLanguageStore()` (наприклад, `notes.saveButton`).

Назви перекладів Біблії — у `src/configs/translationMenuItems.ts`, мови інтерфейсу —
у `src/configs/langMenuItems.ts`.

## Тексти Біблії

Переклади лежать у `public/bible-*.json`: `[{ title, books: [{ title, chapters: [[вірш, …], …] }] }]`
(Старий і Новий Заповіт). Номер вірша — це його позиція в масиві, тож у тексті номерів бути не повинно
(це перевіряє `src/translations.spec.ts`).

- `bible-synodal.json` — Синодальний переклад 1876 р., протестантська редакція (видання 1956 р.),
  суспільне надбання; джерело — `rus-synodal.zefania.xml` з
  [open-bibles](https://github.com/seven1m/open-bibles). Псалми — за єврейською нумерацією,
  синодальний номер — у дужках на початку вірша.
- `bible-kulish.json` — переклад П. Куліша та І. Пулюя (1905), 66 книг, суспільне надбання; джерело —
  [eBible.org, ukr1871](https://ebible.org/details.php?id=ukr1871) (VPL + назви книг з USFM). У налаштуваннях
  його значення лишилося `homenko`: воно збережене в профілях користувачів.
- `bible-npu.json` — Бібліка® Відкрита Новий Переклад Українською™ (Новий Завіт і Псалми),
  © 2022 Biblica, Inc., ліцензія [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/); джерело —
  [eBible.org, ukronpu](https://ebible.org/details.php?id=ukronpu). Текст не змінено (лише формат);
  повідомлення правовласника показується в меню перекладів. Оригінал безкоштовно доступний на
  www.biblica.com і open.bible.
- `bible-kjv.json`, `bible-asv.json`, `bible-web.json` — суспільне надбання.
- `bible-ohienko.json` — під авторським правом: потрібен дозвіл правовласника (меню показує попередження).

Права кожного перекладу описані в `src/configs/translationMenuItems.ts` (`rights`, `notice`).
Скорочення (`short`) стоїть першим у посиланні на вірш: «(СП, Бытие 1:3)».

Після зміни текстів підніміть `CONTENT_VERSION` у `src/stores/content.ts`: браузери користувачів
завантажать тексти заново.

## Палітра і стилі

Кольори, радіуси й шрифт лежать у `public/theme.json`, тож їх можна правити, не чіпаючи коду:
поміняти значення у файлі на сервері (у збірці це `dist/theme.json`) й оновити сторінку.

```json
{
  "colors": { "primary": "#4CAF50", "secondary": "#0090B0", "...": "..." },
  "sizes": { "radius": "8px", "radius-large": "12px", "gap": "24px" },
  "fonts": { "main": "Montserrat, Helvetica, sans-serif" }
}
```

- Значення за замовчуванням і пояснення до кожного — у `src/theme/defaults.ts`.
  У `theme.json` достатньо вказати лише те, що змінюється; решту візьмуть з defaults.
  Якщо файлу немає або він зламаний, застосунок працює з defaults.
- Кожне значення стає CSS-змінною: `colors.primary` → `--app-primary`, `sizes.radius` →
  `--app-radius`, `fonts.main` → `--app-font-main`. У стилях компонентів пишемо
  `var(--app-border)`, а не сам колір.
- Кольори в hex також ідуть у тему Vuetify, тож `color="primary"`, `color="buttons"`,
  `color="delete"` у розмітці беруть їх звідти (у CSS: `rgb(var(--v-theme-secondary))`).
- PWA кешує `theme.json`, тож після зміни на сервері нова палітра з'явиться з наступним
  оновленням застосунку. Під час розробки досить зберегти файл і перезавантажити сторінку.

Основні кольори:

| Ключ                                             | Де                                              |
| ------------------------------------------------ | ----------------------------------------------- |
| `primary`                                        | шапка, нижнє меню, головні кнопки               |
| `secondary`                                      | посилання, активні вкладки, фокус, вибрані дати |
| `buttons`                                        | кнопки додавання                                |
| `delete`                                         | видалення                                       |
| `homefone`, `surface`                            | фон сторінки, картки                            |
| `text`, `text-muted`                             | текст, підказки                                 |
| `border`, `border-light`                         | рамки блоків, лінії між рядками                 |
| `light-blue`, `available-date`, `selected-dates` | календар: шапка, дні з нотатками, інтервал      |
| `on-primary`, `on-secondary`, …                  | текст на кольоровому фоні                       |

## Можливості

- читання Біблії: 6 перекладів, мова інтерфейсу ua / en / ru
- повнотекстовий пошук по тексту перекладу (без реєстрації)
- для зареєстрованих: виділення тексту маркерами, ключові слова, теми з перетягуванням
  віршів і нотаток, нотатки з фільтрами за датою, ключовим словом і темою

Текст перекладу при першому запуску завантажується з `public/bible-*.json` в IndexedDB.
Пошук при першому запиті читає всі вірші з IndexedDB у пам'ять і далі шукає по
нормалізованому тексту (регістр, апострофи, ё/е і пунктуація не враховуються).
Дані користувача (нотатки, теми, ключові слова, виділення) зберігаються в IndexedDB
і синхронізуються з Firestore.
