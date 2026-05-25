import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {getSupabase, isSupabaseConfigured} from './lib/supabase';
import './index.css';

if (isSupabaseConfigured()) {
  void getSupabase();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
