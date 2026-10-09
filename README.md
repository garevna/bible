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
| `pnpm typecheck` | vue-tsc                            |

У продакшн-збірці `base` = `/bible-ukr/` (GitHub Pages), змінюється через `BASE_PATH`.

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

Текст перекладу при першому запуску завантажується з `public/bible-*.json` в IndexedDB.
Дані користувача (нотатки, теми, ключові слова, виділення) зберігаються в IndexedDB
і синхронізуються з Firestore.
