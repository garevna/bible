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

У продакшн-збірці `base` = `/bible-ukr/` (GitHub Pages), змінюється через `BASE_PATH`.

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
