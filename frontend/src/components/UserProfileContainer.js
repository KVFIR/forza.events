import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Profile from './Profile';

function UserProfileContainer() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Получаем данные пользователя
    axios.get('/api/user')
      .then(response => {
        console.log('User data:', response.data); // Логируем данные пользователя
        setUser(response.data);
      })
      .catch(error => console.error(error));

    // Получаем данные ивентов
    axios.get('/api/events')
      .then(response => {
        console.log('Events data:', response.data); // Логируем данные ивентов
        setEvents(response.data);
      })
      .catch(error => console.error(error));
  }, []);

  return user ? <Profile user={user} events={events} /> : <div>Loading...</div>;
}

export default UserProfileContainer;
