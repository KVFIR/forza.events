import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  Button,
  TextField,
  Box,
  CircularProgress,
  Paper,
  Grid
} from '@mui/material';
import { Event as EventIcon, LocationOn, Person } from '@mui/icons-material';

function EventDetails({ user }) {
  const [event, setEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(`/api/events/${id}`);
        setEvent(response.data);
        setTitle(response.data.title);
        setDescription(response.data.description);
        setDate(response.data.date.split('T')[0]);
        setLocation(response.data.location);
        setLoading(false);
      } catch (error) {
        setError('Failed to fetch event details');
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`/api/events/${id}`, {
        title,
        description,
        date,
        location
      });
      setEvent(response.data);
      setIsEditing(false);
    } catch (error) {
      setError('Failed to update event');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await axios.delete(`/api/events/${id}`);
        navigate('/events');
      } catch (error) {
        console.error('Error deleting event:', error);
        if (error.response && error.response.status === 401) {
          setError('You need to be logged in to delete this event.');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else if (error.response) {
          setError(`Failed to delete event: ${error.response.data.message}`);
        } else if (error.request) {
          setError('Failed to delete event: No response received from the server.');
        } else {
          setError(`Failed to delete event: ${error.message}`);
        }
      }
    }
  };

  if (loading) return (
    <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Container>
  );

  if (error) return (
    <Container>
      <Typography color="error" variant="h6">{error}</Typography>
    </Container>
  );

  if (!event) return null;

  const isOrganizer = user && event.organizer && user._id === event.organizer._id;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        {isEditing ? (
          <Box component="form" onSubmit={handleEdit} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="title"
              label="Title"
              name="title"
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
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
              Save Changes
            </Button>
            <Button fullWidth variant="outlined" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </Box>
        ) : (
          <>
            <Typography variant="h4" component="h1" gutterBottom>
              {event.title}
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                  <EventIcon sx={{ mr: 1 }} />
                  {new Date(event.date).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationOn sx={{ mr: 1 }} />
                  {event.location}
                </Typography>
              </Grid>
            </Grid>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {event.description}
            </Typography>
            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
              <Person sx={{ mr: 1 }} />
              {event.organizer ? event.organizer.username : 'Unknown'}
            </Typography>
            {isOrganizer && (
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={() => setIsEditing(true)} sx={{ mr: 1 }}>
                  Edit Event
                </Button>
                <Button variant="outlined" color="error" onClick={handleDelete}>
                  Delete Event
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
}

export default EventDetails;
