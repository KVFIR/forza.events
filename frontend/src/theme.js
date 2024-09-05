import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: 'url("https://i.ibb.co/b3sptVf/DALL-E-2024-09-06-15-56-28-A-racing-event-website-background-featuring-a-high-performance-race-car-i.webp")',
      paper: 'rgba(0, 27, 64, 0.8)',
    },
    text: {
      primary: '#e2fefe',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          backgroundImage: 'url("https://i.ibb.co/b3sptVf/DALL-E-2024-09-06-15-56-28-A-racing-event-website-background-featuring-a-high-performance-race-car-i.webp")',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          },
        '#root': {
          minHeight: '100vh',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(29,18,24,0.8)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
  },
});

export default theme;
