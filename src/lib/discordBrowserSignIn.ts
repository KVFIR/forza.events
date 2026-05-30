import {buildDiscordAuthorizeUrl} from './discordAuth';

/** Redirect the browser tab to Discord OAuth (localhost dev). */
export function startDiscordBrowserSignIn(state = ''): void {
  window.location.assign(buildDiscordAuthorizeUrl(state));
}
