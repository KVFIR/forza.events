import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './i18n';
import App from './App';
import {setupDiscordSupabaseProxy} from './lib/discordUrlProxy';
import {preloadDiscordEmbeddedSdk} from './lib/preloadDiscordSdk';
import {getSupabase, isSupabaseConfigured} from './lib/supabase';
import './index.css';

setupDiscordSupabaseProxy();
preloadDiscordEmbeddedSdk();

if (isSupabaseConfigured()) {
  void getSupabase();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
