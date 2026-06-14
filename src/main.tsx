import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './i18n';
import App from './App';
import {getSupabase, isSupabaseConfigured, isDiscordActivityFrame} from './lib/supabase';
import './index.css';

if (isDiscordActivityFrame()) {
  void import('./lib/discordUrlProxy').then(({ensureDiscordSupabaseProxy}) =>
    ensureDiscordSupabaseProxy(),
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (isSupabaseConfigured()) {
  void getSupabase();
}

void import('./lib/discordBoot').then(({runDiscordBootTasks}) => runDiscordBootTasks());
