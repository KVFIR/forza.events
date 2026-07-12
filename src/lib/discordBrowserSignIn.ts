import {buildDiscordAuthorizeUrl} from './discordAuth';
import {saveAuthReturnTo} from './returnTo';

/** Redirect the browser tab to Discord OAuth (localhost dev). */
export function startDiscordBrowserSignIn(state = ''): void {
  const path = `${window.location.pathname}${window.location.search}`;
  saveAuthReturnTo(path);
  window.location.assign(buildDiscordAuthorizeUrl(state));
}
