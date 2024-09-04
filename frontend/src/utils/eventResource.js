import axios from 'axios';

export const fetchEvents = (page) => {
  return {
    read: async () => {
      const response = await axios.get(`/api/events?page=${page}`);
      console.log('API response:', response.data); // Логирование ответа от API
      return response.data;
    }
  };
};
