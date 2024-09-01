import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

axios.defaults.baseURL = 'http://localhost:5000';

function CreateEvent() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fillTestData = () => {
    setTitle('Test Event');
    setDescription('This is a test event description');
    setDate('2023-12-31');
    setLocation('Test Location');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.post('/api/events', { title, description, date, location });
      console.log('Event creation response:', response);
      navigate('/events'); // Redirect to event list after successful creation
    } catch (err) {
      console.error('Error creating event:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        console.error('Response headers:', err.response.headers);
        setError(`Failed to create event. Server responded with: ${err.response.status} ${err.response.statusText}`);
      } else if (err.request) {
        console.error('Request:', err.request);
        setError('Failed to create event. No response received from the server.');
      } else {
        console.error('Error message:', err.message);
        setError(`Failed to create event. Error: ${err.message}`);
      }
    }
  };

  return (
    <div className="create-event">
      <h2>Create New Event</h2>
      <button type="button" onClick={fillTestData}>Fill Test Data</button>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Title:</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="date">Date:</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="location">Location:</label>
          <input
            type="text"
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>
        <button type="submit">Create Event</button>
      </form>
    </div>
  );
}

export default CreateEvent;
