import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Typography, Grid, CircularProgress } from '@mui/material';
import EventCard from './EventCard';

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
        if (error.response) {
          setError(`Failed to load events. Error: ${error.response.data.message}`);
        } else {
          setError(`Failed to load events. Error: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

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

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Events
      </Typography>
      <Grid container spacing={4}>
        {events.map((event) => (
          <Grid item key={event._id} xs={12} sm={6} md={4}>
            <EventCard
              title={event.title}
              date={event.date}
              eventType={event.eventType}
              laps={event.laps}
              imageUrl={event.imageUrl}
            />
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
