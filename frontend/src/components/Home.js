import React from 'react';
import { Typography, Container, Box } from '@mui/material';

function Home() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h2" gutterBottom>
          Discover and create exciting events for the Forza community!
        </Typography>
      </Box>
    </Container>
  );
}

export default Home;
