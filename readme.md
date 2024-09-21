# FORZA.EVENTS

## Обзор

**FORZA.EVENTS** — это веб-приложение, предназначенное для организации и участия в событиях, связанных с игровым сообществом Forza. Построено на стеке MERN (MongoDB, Express, React, Node.js), интегрирует Discord для аутентификации и использует Material-UI для создания стильного пользовательского интерфейса.

## Содержание

- [Обзор](#обзор)
- [Функции](#функции)
- [Начало работы](#начало-работы)
  - [Предварительные требования](#предварительные-требования)
  - [Установка](#установка)
  - [Конфигурация окружения](#конфигурация-окружения)
  - [Запуск приложения](#запуск-приложения)
- [Структура проекта](#структура-проекта)
- [API Эндпоинты](#api-эндпоинты)
- [Текущий статус проекта](#текущий-статус-проекта)
- [Недавние улучшения](#недавние-улучшения)
- [Будущие улучшения](#будущие-улучшения)
- [Полезные команды](#полезные-команды)
- [Руководство по проекту](#руководство-по-проекту)
- [Ресурсы](#ресурсы)

## Функции

- **Аутентификация пользователей**: Безопасный вход через Discord OAuth2.
- **Управление событиями**: Создание, просмотр, редактирование и удаление событий.
- **Профили пользователей**: Управление и просмотр профилей пользователей с информацией из Discord.
- **Система участия**: Присоединение и отмена регистрации на события с отслеживанием участников.
- **Адаптивный дизайн**: Оптимизировано для различных устройств с использованием Material-UI.
- **Валидация данных**: Надежная валидация как на фронтенде, так и на бэкенде с использованием Yup и PropTypes.

## Начало работы

### Предварительные требования

- **Node.js** (версии 14.x или выше)
- **Yarn** (версии 1.22.x)
- **MongoDB** (локальная установка или MongoDB Atlas)
- **Git**

### Установка

1. **Клонировать репозиторий**
   ```bash
   git clone https://github.com/your-username/forza.events.git
   cd forza.events
   ```

2. **Установить зависимости бэкенда**
   ```bash
   cd backend
   yarn install
   ```

3. **Установить зависимости фронтенда**
   ```bash
   cd ../frontend
   yarn install
   ```

### Настройка бэкенда

- Скопируйте пример переменных окружения:
   ```bash
   cp .env.example .env
   ```
   
- Обновите `backend/.env` с вашими конкретными конфигурациями:
   ```
   MONGO_URI=mongodb://localhost:27017/forza_events
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret
   DISCORD_CALLBACK_URL=http://localhost:5000/auth/discord/callback
   SESSION_SECRET=your_session_secret
   CLIENT_URL=http://localhost:3000
   NODE_ENV=development
   ```

### Запуск приложения

1. **Запустить бэкенд**
   ```bash
   cd backend
   yarn dev
   ```

2. **Запустить фронтенд**
   ```bash
   cd ../frontend
   yarn start
   ```

   Фронтенд теперь должен быть доступен по адресу [http://localhost:3000](http://localhost:3000).

## Структура проекта

```

forza.events/
├── backend/
│   ├── config/
│   │   └── passport.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   └── Event.js
│   ├── routes/
│   │   ├── events.js
│   │   └── users.js
│   ├── utils/
│   │   └── validationSchemas.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Home.js
│   │   │   ├── EventList.js
│   │   │   ├── CreateEvent.js
│   │   │   ├── EventDetails.js
│   │   │   ├── Profile.js
│   │   │   └── EventDetails.js
│   │   ├── utils/
│   │   │   └── eventResource.js
│   │   ├── App.js
│   │   ├── index.css
│   │   └── theme.js
│   └── package.json
├── .gitignore
├── README.md
└── yarn.lock
```

## API Эндпоинты

### Аутентификация
- `GET /auth/discord`: Инициализация Discord OAuth
- `GET /auth/discord/callback`: Обработка обратного вызова Discord OAuth
- `GET /auth/logout`: Выход пользователя

### Пользователи
- `GET /api/users/:id`: Получение информации о пользователе
- `GET /api/user`: Получение текущего аутентифицированного пользователя

### События
- `GET /api/events`: Получение всех событий
- `POST /api/events`: Создание нового события
- `GET /api/events/:id`: Получение деталей конкретного события
- `PUT /api/events/:id`: Обновление существующего события
- `DELETE /api/events/:id`: Удаление события
- `POST /api/events/:id/join`: Присоединение к событию
- `POST /api/events/:id/unregister`: Отмена регистрации на событие
- `GET /api/events/user/:userId`: Получение событий для конкретного пользователя

## Текущий статус проекта

- **Backend**:
  - Основная структура установлена с моделями, маршрутами и промежуточным ПО.
  - Интегрирована аутентификация через Discord.
  - Реализовано создание, управление событиями и отслеживание участников.
  - Установлено соединение с MongoDB с обработкой ошибок.

- **Frontend**:
  - Основные компоненты разработаны с использованием стилей Material-UI.
  - Профили пользователей отображают информацию из Discord.
  - Реализованы списки событий и представления деталей.
  - Используются PropTypes для валидации пропсов.
  - Управление состоянием и интеграция API осуществляется через Axios.

## Недавние улучшения

- Реализована валидация данных с использованием Yup как на фронтенде, так и на бэкенде.
- Улучшена обработка событий в компонентах, таких как `CreateEvent`, `EventDetails` и `EventList`.
- Обновлены стили в `theme.js` и `index.css` для улучшения пользовательского интерфейса.
- Добавлены новые зависимости для улучшения функциональности проекта.
- Улучшен дизайн профиля пользователя с баннерами и визуальными эффектами.
- Отображение подключенных аккаунтов пользователей в профилях.
- Показ событий, на которые зарегистрирован пользователь.
- Проект переведен с npm на Yarn для управления зависимостями.
- Улучшена обработка ошибок и добавлено подробное логирование в компоненте EventList для облегчения отладки.

## Будущие улучшения

1. **Улучшение формы добавления событий**:
   - Переработать интерфейс формы для более интуитивного использования.
   - Добавить предварительный просмотр создаваемого события.
   - Реализовать пошаговый процесс создания события.

2. **Оптимизация отображения событий**:
   - Разработать новый дизайн карточек событий для более эффективного использования пространства.
   - Внедрить систему тегов для быстрой идентификации типа события.
   - Добавить возможность сортировки и фильтрации списка событий.

3. **Улучшение UX**:
   - Реализовать анимации для плавных переходов между страницами и состояниями.
   - Добавить подсказки и обучающие элементы для новых пользователей.
   - Оптимизировать навигацию по сайту для более интуитивного использования.

4. **Поиск и фильтрация**: Реализовать функциональность поиска и фильтры для событий.
   
   - **Описание**: Добавить возможность пользователям искать события по ключевым словам, дате, месту проведения и другим критериям.
   - **Реализация**:
     - **Frontend**: Создать компоненты поиска и фильтрации с использованием Material-UI для удобного интерфейса.
     - **Backend**: Обновить API эндпоинты для поддержки параметров поиска и фильтрации, оптимизировать запросы к базе данных.
     - **Оптимизация**: Использовать индексацию в MongoDB для повышения скорости запросов.

5. **Уведомления**: Добавить систему уведомлений о предстоящих событиях.
   
   - **Описание**: Информировать пользователей о приближающихся событиях, изменениях или комментариях через email или пуш-уведомления.
   - **Реализация**:
     - **Frontend**: Интегрировать библиотеку уведомлений, такую как React-Toastify.
     - **Backend**: Настроить отправку email с использованием сервисов, таких как SendGrid или Nodemailer. Реализовать пуш-уведомления с помощью Web Push API.
     - **База данных**: Добавить модель уведомлений для отслеживания отправленных и прочитанных уведомлений.

6. **Оптимизация производительности**: Оптимизировать запросы к базе данных и реализовать стратегии кэширования.
   
   - **Описание**: Повысить скорость загрузки данных и снизить нагрузку на сервер.
   - **Реализация**:
     - **Backend**: Использовать агрегатные функции MongoDB для сокращения количества запросов. Внедрить кэширование с помощью Redis для часто запрашиваемых данных.
     - **Frontend**: Оптимизировать рендеринг компонентов, использовать ленивую загрузку (lazy loading) и мемоизацию.

7. **Тестирование**:
   
   - **Backend**: Реализовать модульные и интеграционные тесты с использованием таких фреймворков, как Jest и Supertest.
     - **Описание**: Обеспечить надежность и стабильность бэкенд-логики.
     - **Реализация**:
       - Писать тесты для моделей, контроллеров и маршрутов.
       - Настроить тестовую среду с использованием in-memory MongoDB для изолированных тестов.
   
   - **Frontend**: Использовать библиотеки тестирования, такие как React Testing Library и Jest для тестирования компонентов и интеграции.
     - **Описание**: Гарантировать корректность работы UI-компонентов и их взаимодействий.
     - **Реализация**:
       - Писать тесты для критических компонентов, включая формы создания и редактирования событий.
       - Тестировать взаимодействие с API с помощью моков и стабов.

8. **Система комментариев**: Позволить пользователям комментировать события.
   
   - **Описание**: Добавить функциональность, позволяющую пользователям оставлять отзывы и обсуждать события.
   - **Реализация**:
     - **Frontend**: Создать интерфейс для добавления и отображения комментариев под каждым событием.
     - **Backend**: Разработать API для создания, получения и удаления комментариев. Обновить модель события для включения комментариев.
     - **Безопасность**: Реализовать защиту от спама и модерацию комментариев.

9. **Загрузка изображений**: Включить возможность загрузки изображений для постеров событий и профилей пользователей.
   
   - **Описание**: Позволить пользователям добавлять визуальные элементы к событиям и своим профилям.
   - **Реализация**:
     - **Frontend**: Интегрировать компонент загрузки файлов с предварительным просмотром изображений.
     - **Backend**: Настроить обработку загрузок с помощью Multer и хранить изображения на сервисах, таких как AWS S3 или Cloudinary.
     - **Безопасность**: Ограничить типы и размер загружаемых файлов, сканировать на наличие вредоносного кода.

10. **Рейтинг организаторов**: Реализовать систему рейтинга для организаторов событий.
    
    - **Описание**: Позволить пользователям оценивать организаторов после участия в их событиях.
    - **Реализация**:
      - **Frontend**: Добавить интерфейс для выставления рейтингов и отображения среднего рейтинга организатора.
      - **Backend**: Обновить модель пользователя для хранения рейтингов и рассчитывать средний рейтинг.
      - **Бизнес-логика**: Ограничить возможность выставления рейтинга только после участия в событии.

11. **Интеграция с календарем**: Синхронизировать события с календарями пользователей.
    
    - **Описание**: Позволить пользователям добавлять события в свои личные календари (Google Calendar, Outlook и т.д.).
    - **Реализация**:
      - **Frontend**: Добавить кнопку для экспорта события в календарь пользователя.
      - **Backend**: Использовать API календарей для создания событий от имени пользователя.
      - **Безопасность**: Управлять OAuth-токенами пользователей для доступа к их календарям.

12. **Система приглашений**: Позволить пользователям приглашать других на события.
    
    - **Описание**: Добавить возможность отправлять приглашения друзьям или другим пользователям сервиса.
    - **Реализация**:
      - **Frontend**: Создать интерфейс для выбора пользователей и отправки приглашений.
      - **Backend**: Разработать API для отправки и управления приглашениями.
      - **Уведомления**: Интегрировать систему уведомлений для информирования приглашенных пользователей.

13. **Интернационализация (i18n)**: Поддержка нескольких языков.
    
    - **Описание**: Сделать приложение доступным на различных языках для расширения аудитории.
    - **Реализация**:
      - **Frontend**: Использовать библиотеки, такие как react-i18next, для управления переводами.
      - **Backend**: Локализовать сообщения об ошибках и другие текстовые элементы.
      - **UI**: Обеспечить переключение языков через интерфейс и хранение предпочтений пользователя.

14. **Система логирования**: Реализовать расширенное логирование для отслеживания ошибок и мониторинга производительности.
    
    - **Описание**: Внедрить продвинутую систему логирования для улучшения мониторинга и отладки приложения.
    - **Реализация**:
      - **Backend**: Использовать библиотеки, такие как Winston или Morgan, для структурированного логирования. Интегрировать с сервисами мониторинга, такими как Loggly или ELK Stack.
      - **Frontend**: Реализовать логирование ошибок с передачей их на бэкенд для анализа.
      - **Мониторинг**: Настроить дашборды для отслеживания ключевых метрик и ошибок в реальном времени.

## Полезные команды

- **Backend**
  - `yarn dev`: Запуск бэкенда в режиме разработки с nodemon
  - `yarn start`: Запуск сервера бэкенда
  - `yarn test`: Запуск тестов бэкенда

- **Frontend**
  - `yarn start`: Запуск сервера разработки фронтенда
  - `yarn build`: Сборка фронтенда для продакшена
  - `yarn test`: Запуск тестов фронтенда

- **Общие**
  - `yarn install`: Установка всех зависимостей
  - `yarn add <package>`: Добавление новой зависимости
  - `yarn remove <package>`: Удаление зависимости

## Руководство по проекту

- **Переменные окружения**: Обновляйте `.env.example`, когда добавляете новые переменные.
- **Логирование**: Используйте `console.log()` для отладки. Удаляйте или заменяйте на правильное логирование перед коммитом.
- **Именование веток**: Следуйте соглашениям об именовании веток:
  - `feature/<название-функции>`
  - `bugfix/<описание-ошибки>`
  - `refactor/<описание-рефакторинга>`
- **Резервные копии базы данных**: Регулярно создавайте резервные копии базы данных MongoDB.
- **Управление зависимостями**: Держите зависимости актуальными, используя `yarn upgrade`.
- **Контроль версий**: Часто коммитьте изменения с ясными сообщениями и используйте `yarn.lock` для согласованных версий зависимостей.

## Ресурсы

- [Документация Discord OAuth2](https://discord.com/developers/docs/topics/oauth2)
- [Панель управления MongoDB Atlas](https://cloud.mongodb.com/)
- [Документация React](https://reactjs.org/docs/getting-started.html)
- [Документация Express.js](https://expressjs.org/)
- [Документация Material-UI](https://mui.com/material-ui/getting-started/overview/)
- [Документация Yarn](https://yarnpkg.com/getting-started)
- [Документация PropTypes](https://reactjs.org/docs/typechecking-with-proptypes.html)
- [Документация Yup](https://github.com/jquense/yup)

## Внесение изменений

1. **Сделайте форк репозитория**
2. **Создайте новую ветку**
   ```bash
   git checkout -b feature/<название-функции>
   ```
3. **Закоммитьте ваши изменения**
   ```bash
   git commit -m "Описание ваших изменений"
   ```
4. **Запушьте в ветку**
   ```bash
   git push origin feature/<название-функции>
   ```
5. **Создайте Pull Request**