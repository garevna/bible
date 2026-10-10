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

## E2E-тести

Тести в `e2e/` запускаються на production-збірці (`vite build` + `vite preview` на порту 4179).
Локально використовується встановлений Microsoft Edge, нічого завантажувати не треба.
Щоб запустити в Chromium: `pnpm exec playwright install chromium` і `PW_CHANNEL=chromium`.

Тести працюють офлайн: усі запити поза локальним сервером блокуються, тому
в справжній Firestore нічого не потрапляє. Користувач «входить» лише в пам'яті сторінки
(`signInLocally` у `e2e/fixtures.ts`).

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
