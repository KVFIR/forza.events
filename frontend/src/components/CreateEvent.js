import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Container, Typography, Box, Paper } from '@mui/material';

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

    if (!user) {
      console.log('User not authenticated');
      setError('Вы должны войти в систему для создания события');
      return;
    }

    console.log('Attempting to create event for user:', user);

    try {
      const response = await axios.post('/api/events', {
        title,
        description,
        date,
        location
      }, {
        withCredentials: true
      });
      console.log('Event created successfully:', response.data);
      navigate(`/events/${response.data._id}`);
    } catch (error) {
      console.error('Error creating event:', error.response ? error.response.data : error.message);
      if (error.response) {
        setError(`Failed to create event: ${error.response.data.message}`);
      } else if (error.request) {
        setError('Failed to create event: No response received from the server.');
      } else {
        setError(`Failed to create event: ${error.message}`);
      }
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
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
          <Button
            fullWidth
            variant="outlined"
            onClick={fillTestData}
            sx={{ mb: 2 }}
          >
            Fill with Test Data
          </Button>
        </Box>
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Paper>
    </Container>
  );
}

export default CreateEvent;
