import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {bootstrapActivityLaunch} from './lib/activityLaunch';
import {initDiscordActivity} from './lib/discord';
import {setupDiscordSupabaseProxy} from './lib/discordUrlProxy';
import {getSupabase, isSupabaseConfigured} from './lib/supabase';
import './index.css';

setupDiscordSupabaseProxy();
bootstrapActivityLaunch();
void initDiscordActivity();

if (isSupabaseConfigured()) {
  void getSupabase();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
