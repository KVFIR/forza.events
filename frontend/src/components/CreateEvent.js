import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Container, Typography, Box, Paper, Select, MenuItem, InputLabel, FormControl, Grid } from '@mui/material';
import { validateEvent } from '../utils/validation';
import EventCard from './EventCard';

axios.defaults.baseURL = 'http://localhost:5000';

function CreateEvent({ user }) {
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    eventType: '',
    carRestrictions: [],
    raceRules: [],
    weatherConditions: '',
    rewardPoints: 0,
    maxParticipants: 0,
    laps: 0,
    imageUrl: ''
  });
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');

    if (!user) {
      setGeneralError('You must be logged in to create an event');
      return;
    }

    const validationError = await validateEvent(eventData);
    if (validationError) {
      setGeneralError(validationError);
      return;
    }

    try {
      const response = await axios.post('/api/events', eventData, {
        withCredentials: true
      });
      navigate(`/events/${response.data._id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      setGeneralError('Failed to create event. Please try again later.');
    }
  }, [user, eventData, navigate]);

  return (
    <Container maxWidth="lg">
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Create New Event
            </Typography>
            {generalError && (
              <Typography color="error" sx={{ mb: 2 }}>
                {generalError}
              </Typography>
            )}
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="title"
                label="Title"
                name="title"
                value={eventData.title}
                onChange={handleChange}
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
                value={eventData.description}
                onChange={handleChange}
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
                value={eventData.date}
                onChange={handleChange}
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
                value={eventData.location}
                onChange={handleChange}
                error={!!errors.location}
                helperText={errors.location}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel id="eventType-label">Event Type</InputLabel>
                <Select
                  labelId="eventType-label"
                  id="eventType"
                  name="eventType"
                  value={eventData.eventType}
                  onChange={handleChange}
                  label="Event Type"
                >
                  <MenuItem value="Qualification">Qualification</MenuItem>
                  <MenuItem value="Race">Race</MenuItem>
                  <MenuItem value="Championship">Championship</MenuItem>
                </Select>
              </FormControl>
              <TextField
                margin="normal"
                fullWidth
                id="laps"
                label="Laps"
                name="laps"
                type="number"
                value={eventData.laps}
                onChange={handleChange}
              />
              <TextField
                margin="normal"
                fullWidth
                id="imageUrl"
                label="Image URL"
                name="imageUrl"
                value={eventData.imageUrl}
                onChange={handleChange}
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
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ position: 'sticky', top: '20px' }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Event Preview
            </Typography>
            <EventCard
              title={eventData.title}
              date={eventData.date}
              eventType={eventData.eventType}
              laps={eventData.laps}
              imageUrl={eventData.imageUrl}
            />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

CreateEvent.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired,
  }),
};

export default CreateEvent;
