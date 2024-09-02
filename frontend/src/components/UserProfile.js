import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { Container, Typography, Box, Avatar, Paper, CircularProgress, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import { FaYoutube, FaTwitch, FaXbox, FaSteam, FaSpotify, FaReddit, FaTwitter, FaFacebook, FaInstagram } from 'react-icons/fa';

function UserProfile() {
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
        setUser(userResponse.data);
        setEvents(eventsResponse.data);
        setLoading(false);
      } catch (error) {
        setError('Failed to fetch user data or events');
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
      <Paper elevation={3} sx={{ p: 3, mb: 4, position: 'relative' }}>
        {user.banner && (
          <Box
            component="div"
            sx={{
              width: '100%',
              height: '200px',
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 1,
              borderRadius: '4px 4px 0 0',
              backgroundImage: `url(https://cdn.discordapp.com/banners/${user.discordId}/${user.banner}.png?size=1024), linear-gradient(to bottom, rgba(0,0,0,0) 80%, rgba(47,49,54,255))`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundBlendMode: 'overlay'
            }}
          />
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, position: 'relative', zIndex: 2, mt: '118px' }}>
          <Avatar 
            src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`} 
            alt="User Avatar" 
            sx={{ width: 100, height: 100, mr: 2, border: '4px solid #7289da', borderRadius: '50%' }}
          />
          <Box>
            <Typography variant="h4">{user.username}#{user.discriminator}</Typography>
            <Typography variant="body1">{user.email}</Typography>
          </Box>
        </Box>
        <Typography variant="h6">About me!</Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          I like video games! Lorem ipsum dolor sit amet. Et impedit quasi qui architecto optio et ipsum quia 33 earum accusamus. In debitis tempora quo facilis iusto ut sunt optio ea tenetur possimus aut omnis autem non corporis inventore.
        </Typography>
        <Typography variant="h6" sx={{ mt: 4 }}>Connections</Typography>
        <List>
          {user.connections && user.connections.length > 0 ? (
            user.connections.map(connection => (
              <ListItem key={connection.id}>
                <ListItemAvatar>
                  {connection.type === 'youtube' && <FaYoutube />}
                  {connection.type === 'twitch' && <FaTwitch />}
                  {connection.type === 'xbox' && <FaXbox />}
                  {connection.type === 'steam' && <FaSteam />}
                  {connection.type === 'spotify' && <FaSpotify />}
                  {connection.type === 'reddit' && <FaReddit />}
                  {connection.type === 'twitter' && <FaTwitter />}
                  {connection.type === 'facebook' && <FaFacebook />}
                  {connection.type === 'instagram' && <FaInstagram />}
                </ListItemAvatar>
                <ListItemText primary={connection.name} />
              </ListItem>
            ))
          ) : (
            <Typography variant="body1">No connections available.</Typography>
          )}
        </List>
        <Typography variant="h6" sx={{ mt: 4 }}>Events</Typography>
        {events.length > 0 ? (
          <List>
            {events.map(event => (
              <ListItem key={event._id} component={RouterLink} to={`/events/${event._id}-${event.title.toLowerCase().replace(/\s+/g, '-')}`} button>
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
    </Container>
  );
}

export default UserProfile;
