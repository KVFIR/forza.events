import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

axios.defaults.baseURL = 'http://localhost:5000';

function CreateEvent({ user }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const getRandomTitle = () => {
    const adjectives = ['Exciting', 'Amazing', 'Thrilling', 'Epic', 'Awesome'];
    const nouns = ['Race', 'Challenge', 'Tournament', 'Competition', 'Event'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} Forza ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  };

  const getRandomDescription = () => {
    const descriptions = [
      'Join us for an unforgettable racing experience!',
      'Test your skills against the best drivers in the community!',
      'Compete for glory and amazing prizes!',
      'Experience the thrill of high-speed racing action!',
      'Show off your custom rides and racing prowess!'
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  };

  const getRandomDate = () => {
    const start = new Date();
    const end = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
  };

  const getRandomLocation = () => {
    const locations = ['Horizon Festival', 'Goliath Circuit', 'Fortune Island', 'LEGO Valley', 'Needle Climb'];
    return locations[Math.floor(Math.random() * locations.length)];
  };

  const fillTestData = () => {
    setTitle(getRandomTitle());
    setDescription(getRandomDescription());
    setDate(getRandomDate());
    setLocation(getRandomLocation());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      console.log('Sending event data:', { title, description, date, location });
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
