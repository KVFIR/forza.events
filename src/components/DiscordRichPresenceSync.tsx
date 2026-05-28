import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {useRichPresenceOverride} from '../context/DiscordRichPresenceContext';
import {useAuth} from '../context/AuthContext';
import {
  applyDiscordRichPresence,
  buildRouteRichPresence,
  canSyncRichPresence,
  mergeRichPresence,
} from '../lib/discordRichPresence';

/** Keeps Discord profile Rich Presence in sync with the current route and screen overrides. */
export function DiscordRichPresenceSync() {
  const {pathname} = useLocation();
  const {override} = useRichPresenceOverride();
  const {isSignedIn, discordReady} = useAuth();

  useEffect(() => {
    if (!canSyncRichPresence() || !discordReady || !isSignedIn) return;

    const routePresence = buildRouteRichPresence(pathname);
    const activity = mergeRichPresence(routePresence, override);
    void applyDiscordRichPresence(activity);
  }, [pathname, override, isSignedIn, discordReady]);

  return null;
}
