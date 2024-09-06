import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { Container, Typography, Avatar, Paper, CircularProgress, List, ListItem, ListItemAvatar, ListItemText, Grid, Box } from '@mui/material';
import { FaTwitch, FaXbox } from 'react-icons/fa';

const UserProfile = React.memo(function UserProfile() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserAndEvents = async () => {
      try {
        const [userResponse, eventsResponse] = await Promise.all([
          axios.get(`/api/users/${id}`),
          axios.get(`/api/events/user/${id}`)
        ]);
        if (!userResponse.data) {
          throw new Error('User not found');
        }
        setUser(userResponse.data);
        setEvents(eventsResponse.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data or events:', error);
        setError(error.message || 'Failed to fetch user data or events');
        setLoading(false);
      }
    };

    fetchUserAndEvents();
  }, [id]);

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

  if (!user) return null;

  return (
    <Container sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar 
                src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`} 
                alt="User Avatar" 
                sx={{ width: 100, height: 100, mr: 2 }}
              />
              <Typography variant="h4">{user.username}</Typography>
            </Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Connections</Typography>
            <List>
              {user.connections && user.connections.length > 0 ? (
                user.connections.map(connection => {
                  if (connection.type === 'xbox' || connection.type === 'twitch') {
                    const link = connection.type === 'xbox' 
                      ? `https://www.xbox.com/lv-LV/play/user/${connection.name}`
                      : `https://twitch.tv/${connection.name}`;
                    return (
                      <ListItem button key={connection.id} component="a" href={link} target="_blank" rel="noopener noreferrer">
                        <ListItemAvatar>
                          {connection.type === 'xbox' && <FaXbox />}
                          {connection.type === 'twitch' && <FaTwitch />}
                        </ListItemAvatar>
                        <ListItemText primary={connection.name} />
                      </ListItem>
                    );
                  }
                  return null;
                }).filter(Boolean)
              ) : (
                <Typography variant="body1">No Xbox or Twitch connections available.</Typography>
              )}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Events</Typography>
            {events.length > 0 ? (
              <List>
                {events.map(event => (
                  <ListItem 
                    button
                    key={event._id} 
                    component={RouterLink} 
                    to={`/events/${event._id}-${event.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <ListItemText 
                      primary={event.title}
                      secondary={`Date: ${new Date(event.date).toLocaleDateString()}, Location: ${event.location}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1">No events available.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
});

export default UserProfile;
