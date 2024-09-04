import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import axios from 'axios';

const Home = lazy(() => import('./components/Home'));
const EventList = lazy(() => import('./components/EventList'));
const CreateEvent = lazy(() => import('./components/CreateEvent'));
const UserProfileContainer = lazy(() => import('./components/UserProfileContainer'));
const EventDetails = lazy(() => import('./components/EventDetails'));
const UserProfile = lazy(() => import('./components/UserProfile'));

axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.withCredentials = true;

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

import { AppBar, Toolbar, Typography, Button, Box, CircularProgress } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get('/api/user', { withCredentials: true });
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user:', error);
        if (error.response && error.response.status === 401) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.get('/auth/logout');
      setUser(null);
      // Redirect to home page after logout
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppBar position="static" color="default" elevation={0}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              FORZA.EVENTS
            </Typography>
            <Box>
              <Button color="inherit" component={RouterLink} to="/">Home</Button>
              <Button color="inherit" component={RouterLink} to="/events">Events</Button>
              {user && <Button color="inherit" component={RouterLink} to={`/user/${user._id}`}>Profile</Button>}
              {user ? (
                <Button color="inherit" onClick={handleLogout}>Logout</Button>
              ) : (
                <Button color="inherit" onClick={() => window.location.href = 'http://localhost:5000/auth/discord'}>Login</Button>
              )}
            </Box>
          </Toolbar>
        </AppBar>
        <Suspense fallback={<CircularProgress />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<EventList />} />
            <Route path="/create-event" element={<CreateEvent user={user} />} />
            <Route path="/profile" element={user ? <UserProfileContainer /> : <Navigate to="/" />} />
            <Route path="/events/:id" element={<EventDetails user={user} />} />
            <Route path="/user/:id" element={<UserProfile />} />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;
