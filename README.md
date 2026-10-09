# Bible

Читання Біблії з нотатками, темами, ключовими словами та виділенням тексту.
Vue 3 + TypeScript + Pinia + Vuetify 3, збірка Vite, PWA.

Це перенесення застосунку `bible-ukr` (Vue 2 + Vuex + Vuetify 2).

## Запуск

Потрібен Node `^22.22.2` або `>=24.15` (див. `.node-version`).

```sh
yarn install
cp .env.example .env.local   # ключі Firebase та функції шифрування сесії
yarn dev
```

| Команда          | Що робить                          |
| ---------------- | ---------------------------------- |
| `yarn dev`       | dev-сервер                         |
| `yarn build`     | перевірка типів і збірка в `dist/` |
| `yarn preview`   | перегляд зібраної версії           |
| `yarn lint`      | ESLint                             |
| `yarn test`      | unit-тести (Vitest)                |
| `yarn typecheck` | vue-tsc                            |

У продакшн-збірці `base` = `/bible-ukr/` (GitHub Pages), змінюється через `BASE_PATH`.

## Структура

```
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
