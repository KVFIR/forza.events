import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Container, Typography, Box, Paper, Select, MenuItem, Chip, InputLabel, FormControl } from '@mui/material';
import { validateEvent } from '../utils/validation';

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
    maxParticipants: 0
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

  const handleArrayChange = (e, field) => {
    const { value } = e.target;
    setEventData(prevData => ({
      ...prevData,
      [field]: value
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
    <Container maxWidth="sm">
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
            id="startTime"
            label="Start Time"
            name="startTime"
            type="time"
            InputLabelProps={{
              shrink: true,
            }}
            value={eventData.startTime}
            onChange={handleChange}
            error={!!errors.startTime}
            helperText={errors.startTime}
          />
          <TextField
            margin="normal"
            fullWidth
            id="endTime"
            label="End Time"
            name="endTime"
            type="time"
            InputLabelProps={{
              shrink: true,
            }}
            value={eventData.endTime}
            onChange={handleChange}
            error={!!errors.endTime}
            helperText={errors.endTime}
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
          <FormControl fullWidth margin="normal">
            <InputLabel id="carRestrictions-label">Car Restrictions</InputLabel>
            <Select
              labelId="carRestrictions-label"
              id="carRestrictions"
              name="carRestrictions"
              multiple
              value={eventData.carRestrictions}
              onChange={(e) => handleArrayChange(e, 'carRestrictions')}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="GT3">GT3</MenuItem>
              <MenuItem value="Tuning allowed">Tuning allowed</MenuItem>
              <MenuItem value="Stock only">Stock only</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel id="raceRules-label">Race Rules</InputLabel>
            <Select
              labelId="raceRules-label"
              id="raceRules"
              name="raceRules"
              multiple
              value={eventData.raceRules}
              onChange={(e) => handleArrayChange(e, 'raceRules')}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="Mandatory Pit Stops">Mandatory Pit Stops</MenuItem>
              <MenuItem value="No Assists">No Assists</MenuItem>
              <MenuItem value="Simulation Damage">Simulation Damage</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="normal"
            fullWidth
            id="weatherConditions"
            label="Weather Conditions"
            name="weatherConditions"
            value={eventData.weatherConditions}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            fullWidth
            id="rewardPoints"
            label="Reward Points"
            name="rewardPoints"
            type="number"
            value={eventData.rewardPoints}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            fullWidth
            id="maxParticipants"
            label="Maximum Participants"
            name="maxParticipants"
            type="number"
            value={eventData.maxParticipants}
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
    </Container>
  );
}

CreateEvent.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired,
  }),
};

export default CreateEvent;
