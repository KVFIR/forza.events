import {patchUrlMappings} from '@discord/embedded-app-sdk';
import {isStandaloneBrowser} from './discord';

const PROXY_PREFIX = '/.proxy/supabase';

/** Rewrite Supabase REST/Realtime/Functions hosts through the Discord Activity proxy. */
export function setupDiscordSupabaseProxy(): void {
  if (isStandaloneBrowser()) return;

  const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!raw?.trim()) return;

  let host: string;
  try {
    host = new URL(raw.trim()).host;
  } catch {
    return;
  }

  patchUrlMappings([{prefix: PROXY_PREFIX, target: host}]);
}

export const discordSupabaseProxyPrefix = PROXY_PREFIX;
