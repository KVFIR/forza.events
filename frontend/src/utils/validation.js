import axios from 'axios';

export const validateEvent = async (eventData) => {
  try {
    await axios.post('/api/events/validate', eventData);
    return null; // Валидация прошла успешно
  } catch (error) {
    if (error.response && error.response.data) {
      return error.response.data.message;
    }
    return 'An error occurred during validation';
  }
};
