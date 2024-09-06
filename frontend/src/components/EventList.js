import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Typography, Grid, CircularProgress, Button, Tooltip } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import EventCard from './EventCard';
import PropTypes from 'prop-types';

function EventList({ user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get('/api/events');
        setEvents(response.data);
      } catch (error) {
        console.error('Error fetching events:', error);
        setError('Failed to load events. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error" variant="h6">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Events
      </Typography>
      <Tooltip title={user ? "" : "Please log in to create an event"}>
        <span>
          <Button
            variant="contained"
            color="primary"
            component={user ? RouterLink : "button"}
            to={user ? "/events/create" : undefined}
            onClick={user ? undefined : (e) => e.preventDefault()}
            disabled={!user}
            sx={{ mb: 3 }}
          >
            Create New Event
          </Button>
        </span>
      </Tooltip>
      <Grid container spacing={3}>
        {events.map((event) => (
          <Grid item xs={12} sm={6} md={4} key={event._id}>
            <EventCard event={event} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

EventList.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired,
  }),
};

export default EventList;
