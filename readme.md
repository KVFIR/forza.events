# FORZA.EVENTS

## Обзор проекта

FORZA.EVENTS - веб-приложение для организации и участия в событиях, связанных с игрой Forza. Использует стек MERN (MongoDB, Express, React, Node.js) с аутентификацией через Discord и Material-UI для стилизации.

## Быстрый старт

1. Установка:
   ```bash
   git clone https://github.com/your-username/forza.events.git
   cd forza.events
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. Настройка `.env` (в папке `backend`):
   ```
   MONGO_URI=mongodb://localhost:27017/forza_events
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret
   DISCORD_CALLBACK_URL=http://localhost:5000/auth/discord/callback
   SESSION_SECRET=your_session_secret
   PORT=5000
   ```

3. Запуск:
   - Бэкенд: `cd backend && npm run dev`
   - Фронтенд: `cd frontend && npm start`

## Структура проекта

```
forza.events/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── Event.js
│   ├── routes/
│   │   ├── events.js
│   │   └── users.js
│   ├── middleware/
│   │   └── auth.js
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Home.js
│   │   │   ├── EventList.js
│   │   │   ├── CreateEvent.js
│   │   │   ├── EventDetails.js
│   │   │   ├── UserProfile.js
│   │   │   └── UserProfileContainer.js
│   │   ├── App.js
│   │   └── theme.js
│   └── public/
└── README.md
```

## API Endpoints

- `GET /api/events`: Список событий
- `POST /api/events`: Создание события
- `GET /api/events/:id`: Получение конкретного события
- `PUT /api/events/:id`: Обновление события
- `DELETE /api/events/:id`: Удаление события
- `POST /api/events/:id/join`: Присоединение к событию
- `POST /api/events/:id/unregister`: Отмена регистрации на событие
- `GET /api/events/user/:userId`: Получение событий пользователя
- `GET /api/users/:id`: Получение информации о пользователе
- `GET /auth/discord`: Начало Discord OAuth
- `GET /auth/discord/callback`: Callback Discord OAuth
- `GET /api/user`: Получение информации о текущем пользователе
- `GET /auth/logout`: Выход из системы

## Текущее состояние проекта

- Реализована базовая структура бэкенда и фронтенда
- Настроена и интегрирована аутентификация через Discord
- Реализовано создание, отображение, редактирование и удаление событий
- Добавлен профиль пользователя с отображением информации из Discord
- Реализована функция выхода из системы
- Добавлена обработка ошибок и уведомления пользователя
- Улучшен UI с использованием Material-UI компонентов
- Реализована система участия в событиях
- Добавлено отображение списка участников с аватарками
- Реализована возможность отмены участия в событии
- Добавлена валидация пропсов с использованием PropTypes
- Добавлена валидация данных на бэкенде и фронтенде
- Реализованы человекопонятные URL для страниц событий
- Добавлены ссылки на профили пользователей в списке участников события

## Недавние улучшения

- Реализована валидация данных с использованием Yup на фронтенде и бэкенде
- Улучшена обработка событий в компонентах CreateEvent, EventDetails и EventList
- Обновлены стили в theme.js и index.css для улучшения визуального представления
- Добавлены новые зависимости для улучшения функциональности проекта

## Следующие шаги

1. Реализовать поиск и фильтрацию событий
2. Добавить систему уведомлений о предстоящих событиях
3. Оптимизировать запросы к базе данных для улучшения производительности
4. Добавить тесты для основных функций бэкенда и фронтенда
5. Реализовать систему комментариев к событиям
6. Добавить возможность загрузки изображений для событий
7. Реализовать систему рейтинга для организаторов событий
8. Добавить интеграцию с календарем пользователя
9. Реализовать систему приглашений на события
10. Добавить поддержку нескольких языков (i18n)
11. Улучшить UX/UI на основе обратной связи пользователей
12. Реализовать систему логирования для отслеживания ошибок и производительности

## Полезные команды

- `npm run dev`: Запуск бэкенда в режиме разработки
- `npm start`: Запуск фронтенда
- `npm test`: Запуск тестов
- `npm run build`: Сборка фронтенда для продакшена

## Заметки

- Обновлять `.env.example` при добавлении новых переменных окружения
- Использовать `console.log()` только для отладки, удалять перед коммитом
- Придерживаться соглашения о именовании веток: `feature/`, `bugfix/`, `refactor/`
- Регулярно делать бэкапы базы данных
- Проверять обновления зависимостей и обновлять их по мере необходимости

## Ресурсы

- [Документация Discord OAuth2](https://discord.com/developers/docs/topics/oauth2)
- [MongoDB Atlas Dashboard](https://cloud.mongodb.com/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Express.js Documentation](https://expressjs.com/)
- [Material-UI Documentation](https://mui.com/material-ui/getting-started/overview/)
