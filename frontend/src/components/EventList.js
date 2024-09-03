import React, { useState, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button,
  CircularProgress
} from '@mui/material';
import { Event as EventIcon, LocationOn, ArrowForward } from '@mui/icons-material';

const EventCard = memo(function EventCard({ event }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            {event.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <EventIcon sx={{ mr: 1 }} fontSize="small" />
            {new Date(event.date).toLocaleDateString()}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
            <LocationOn sx={{ mr: 1 }} fontSize="small" />
            {event.location}
          </Typography>
        </CardContent>
        <CardActions>
          <Button 
            component={RouterLink} 
            to={`/events/${event._id}-${event.title.toLowerCase().replace(/\s+/g, '-')}`} 
            endIcon={<ArrowForward />}
          >
            View Details
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );
});

EventCard.propTypes = {
  event: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
  }).isRequired,
};

function EventList({ user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`/api/events?page=${page}&limit=10`);
        setEvents(prevEvents => [...prevEvents, ...response.data.events]);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to fetch events. Please try again later.');
        setLoading(false);
      }
    };

    fetchEvents();
  }, [page]);

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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Upcoming Events
      </Typography>
      {user && (
        <Button
          component={RouterLink}
          to="/create-event"
          variant="contained"
          color="primary"
          sx={{ mb: 2 }}
        >
          Create Event
        </Button>
      )}
      {events.length === 0 ? (
        <Typography variant="body1">No events found. Why not create one?</Typography>
      ) : (
        <Grid container spacing={3}>
          {events.map(event => (
            <EventCard key={event._id} event={event} />
          ))}
        </Grid>
      )}
    </Container>
  );
}

EventList.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired,
  }),
};

export default EventList;
