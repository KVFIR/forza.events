import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Container, Typography, Box } from '@mui/material';

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
    <Container maxWidth="sm">
      <Typography variant="h4" component="h1" gutterBottom>
        Create New Event
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="title"
          label="Title"
          name="title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="description"
          label="Description"
          name="description"
          multiline
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="date"
          label="Date"
          name="date"
          type="date"
          InputLabelProps={{
            shrink: true,
          }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="location"
          label="Location"
          name="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
        >
          Create Event
        </Button>
      </Box>
    </Container>
  );
}

export default CreateEvent;
