import React from 'react';
import PropTypes from 'prop-types';
import { Container, Typography, Box, Avatar, List, ListItem, ListItemAvatar, ListItemText, Paper, Grid } from '@mui/material';
import { FaYoutube, FaTwitch, FaXbox, FaSteam, FaSpotify, FaReddit, FaTwitter, FaFacebook, FaInstagram, FaCrown } from 'react-icons/fa';
import { Link as RouterLink } from 'react-router-dom';

function Profile({ user, events }) {
  if (!user) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Typography variant="h6">Please log in to view your profile.</Typography>
    </Container>;
  }

  // Фильтруем ивенты, на которые зарегистрировался пользователь
  const registeredEvents = events.filter(event => 
    event.participants && event.participants.some(participant => participant._id === user._id)
  );

  console.log('Registered events:', registeredEvents); // Логируем отфильтрованные ивенты

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
        <Typography variant="h6">Registered Events</Typography>
        <List>
          {registeredEvents && registeredEvents.length > 0 ? (
            registeredEvents.map(event => (
              <ListItem 
                key={event._id} 
                component={RouterLink} 
                to={`/events/${event._id}-${event.title.toLowerCase().replace(/\s+/g, '-')}`}
                sx={{
                  color: 'inherit',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                <ListItemAvatar>
                  {event.organizer._id === user._id && <FaCrown style={{ color: '#FFD700' }} />}
                </ListItemAvatar>
                <ListItemText 
                  primary={event.title} 
                  secondary={new Date(event.date).toLocaleDateString()} 
                />
              </ListItem>
            ))
          ) : (
            <Typography variant="body1">No registered events available.</Typography>
          )}
        </List>
      </Paper>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6">About me!</Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              I like video games! Lorem ipsum dolor sit amet. Et impedit quasi qui architecto optio et ipsum quia 33 earum accusamus. In debitis tempora quo facilis iusto ut sunt optio ea tenetur possimus aut omnis autem non corporis inventore.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6">Connections</Typography>
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
                      {/* Добавьте другие иконки по мере необходимости */}
                    </ListItemAvatar>
                    <ListItemText primary={connection.name} />
                  </ListItem>
                ))
              ) : (
                <Typography variant="body1">No connections available.</Typography>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

// Добавляем валидацию пропсов
Profile.propTypes = {
  user: PropTypes.shape({
    discordId: PropTypes.string.isRequired,
    avatar: PropTypes.string,
    username: PropTypes.string.isRequired,
    discriminator: PropTypes.string,
    email: PropTypes.string,
    locale: PropTypes.string,
    premiumType: PropTypes.number,
    flags: PropTypes.number,
    banner: PropTypes.string,
    guilds: PropTypes.arrayOf(PropTypes.object),
    connections: PropTypes.arrayOf(PropTypes.object),
    _id: PropTypes.string.isRequired, // Добавляем валидацию для user._id
  }).isRequired,
  events: PropTypes.arrayOf(PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    organizer: PropTypes.shape({
      _id: PropTypes.string.isRequired,
    }).isRequired,
    participants: PropTypes.arrayOf(PropTypes.shape({
      _id: PropTypes.string.isRequired,
    })).isRequired,
  })).isRequired,
};

export default Profile;
