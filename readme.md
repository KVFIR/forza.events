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
│   │   └── events.js
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
│   │   │   └── Login.js
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
- `GET /auth/discord`: Начало Discord OAuth
- `GET /auth/discord/callback`: Callback Discord OAuth
- `GET /api/user`: Получение информации о текущем пользователе
- `GET /auth/logout`: Выход из системы

## Рабочий процесс

1. Создание новой ветки для фичи: `git checkout -b feature/name`
2. Внесение изменений и локальное тестирование
3. Коммит изменений: `git commit -am 'Add feature'`
4. Отправка изменений: `git push origin feature/name`
5. Слияние ветки с main после завершения работы

## Тестирование

- Бэкенд: `cd backend && npm test`
- Фронтенд: `cd frontend && npm test`

## Полезные команды

- `npm run dev`: Запуск бэкенда в режиме разработки
- `npm start`: Запуск фронтенда
- `npm test`: Запуск тестов
- `npm run build`: Сборка фронтенда для продакшена

## Текущее состояние проекта

- Реализована базовая структура бэкенда и фронтенда
- Настроена и интегрирована аутентификация через Discord
- Реализовано создание, отображение, редактирование и удаление событий
- Добавлен профиль пользователя с отображением информации из Discord
- Реализована функция выхода из системы
- Добавлена обработка ошибок и уведомления пользователя
- Улучшен UI с использованием Material-UI компонентов
- Добавлена функция заполнения тестовыми данными при создании события
- Реализована система участия в событиях
- Добавлено отображение списка участников с аватарками

## Следующие шаги

1. Улучшить UI/UX фронтенда
2. Добавить валидацию данных на бэкенде и фронтенде
3. Добавить пагинацию для списка событий
4. Реализовать поиск и фильтрацию событий
5. Добавить систему уведомлений о предстоящих событиях
6. Реализовать возможность отмены участия в событии
7. Добавить страницу с детальной информацией о пользователе

## Ресурсы

- [Документация Discord OAuth2](https://discord.com/developers/docs/topics/oauth2)
- [MongoDB Atlas Dashboard](https://cloud.mongodb.com/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Express.js Documentation](https://expressjs.com/)
- [Material-UI Documentation](https://mui.com/material-ui/getting-started/overview/)

## Заметки

- Обновлять `.env.example` при добавлении новых переменных окружения
- Использовать `console.log()` только для отладки, удалять перед коммитом
- Придерживаться соглашения о именовании веток: `feature/`, `bugfix/`, `refactor/`
- Регулярно делать бэкапы базы данных
- Проверять обновления зависимостей и обновлять их по мере необходимости

## Идеи для дальнейшего развития

- [ ] Добавить систему комментариев к событиям
- [ ] Реализовать функцию поиска событий
- [ ] Интегрировать систему уведомлений
- [ ] Добавить возможность загрузки изображений для событий
- [ ] Реализовать систему рейтинга для организаторов событий
```
