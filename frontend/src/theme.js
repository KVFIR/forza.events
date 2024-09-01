import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#7289da', // Discord Blurple
    },
    secondary: {
      main: '#43b581', // Discord Green
    },
    background: {
      default: '#36393f', // Discord Dark
      paper: '#2f3136', // Discord Darker
    },
    text: {
      primary: '#dcddde', // Discord Light
      secondary: '#72767d', // Discord Grey
    },
  },
  typography: {
    fontFamily: '"Whitney", "Helvetica Neue", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

export default theme;
