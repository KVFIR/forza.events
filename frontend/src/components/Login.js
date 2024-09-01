import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Typography, Container } from '@mui/material';

function Login() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('success') === 'true') {
      navigate('/');
    }
  }, [location, navigate]);

  const handleLogin = () => {
    window.location.href = 'http://localhost:5000/auth/discord';
  };

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" component="h1" gutterBottom>
        Login
      </Typography>
      <Button variant="contained" color="primary" onClick={handleLogin}>
        Login with Discord
      </Button>
    </Container>
  );
}

export default Login;
