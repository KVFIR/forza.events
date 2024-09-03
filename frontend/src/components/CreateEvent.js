import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Container, Typography, Box, Paper } from '@mui/material';
import * as yup from 'yup';

const eventSchema = yup.object().shape({
  title: yup.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be at most 100 characters').required('Title is required'),
  description: yup.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be at most 1000 characters').required('Description is required'),
  date: yup.date().required('Date is required'),
  location: yup.string().min(3, 'Location must be at least 3 characters').max(100, 'Location must be at most 100 characters').required('Location is required'),
});

axios.defaults.baseURL = 'http://localhost:5000';

function CreateEvent({ user }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
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

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setErrors({});

    if (!user) {
      setErrors({ general: 'You must be logged in to create an event' });
      return;
    }

    try {
      await eventSchema.validate({ title, description, date, location }, { abortEarly: false });
    } catch (validationError) {
      const newErrors = {};
      validationError.inner.forEach((err) => {
        newErrors[err.path] = err.message;
      });
      setErrors(newErrors);
      return;
    }

    try {
      const response = await axios.post('/api/events', {
        title,
        description,
        date,
        location
      }, {
        withCredentials: true
      });
      navigate(`/events/${response.data._id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      setGeneralError('Failed to create event. Please try again later.');
    }
  }, [user, title, description, date, location, navigate]);

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
            error={!!errors.title}
            helperText={errors.title}
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
            error={!!errors.description}
            helperText={errors.description}
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
            error={!!errors.date}
            helperText={errors.date}
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
            error={!!errors.location}
            helperText={errors.location}
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
        {generalError && (
          <Typography color="error" sx={{ mt: 2 }}>
            {generalError}
          </Typography>
        )}
      </Paper>
    </Container>
  );
}

CreateEvent.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired,
  }).isRequired,
};

export default CreateEvent;
