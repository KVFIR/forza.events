export type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  discriminator?: string;
};

export function avatarUrl(user: DiscordUser): string | null {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
}

export async function exchangeCode(
  code: string,
  redirectUriOverride?: string | null,
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}> {
  const clientId = Deno.env.get('DISCORD_CLIENT_ID')!;
  const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET')!;
  const redirectUri = redirectUriOverride?.trim() || Deno.env.get('DISCORD_REDIRECT_URI') || '';

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
  });
  if (!redirectUri) {
    throw new Error('DISCORD_REDIRECT_URI is required for browser OAuth');
  }
  body.set('redirect_uri', redirectUri);

  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord token exchange failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  if (!res.ok) {
    throw new Error(`Discord user fetch failed: ${res.status}`);
  }
  return res.json();
}

export async function verifyDiscordToken(
  accessToken: string | null | undefined,
): Promise<DiscordUser | null> {
  if (!accessToken) return null;
  try {
    return await fetchDiscordUser(accessToken);
  } catch {
    return null;
  }
}

export function botHeaders(): HeadersInit {
  const token = Deno.env.get('DISCORD_BOT_TOKEN');
  if (!token) throw new Error('DISCORD_BOT_TOKEN not set');
  return {Authorization: `Bot ${token}`, 'Content-Type': 'application/json'};
}

export type DiscordGuildSummary = {
  id: string;
  name: string;
  icon: string | null;
  /** Present on GET /users/@me/guilds (user OAuth token). */
  permissions?: string;
};

const MANAGE_GUILD = 0x20n;
const ADMINISTRATOR = 0x8n;

export function userCanManageGuild(permissions: string | undefined): boolean {
  if (!permissions) return true;
  const p = BigInt(permissions);
  return (p & ADMINISTRATOR) === ADMINISTRATOR || (p & MANAGE_GUILD) === MANAGE_GUILD;
}

export async function fetchUserGuilds(
  accessToken: string,
): Promise<DiscordGuildSummary[]> {
  const res = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  if (!res.ok) {
    throw new Error(`Failed to list user guilds: ${res.status}`);
  }
  return res.json();
}

/** Whether the bot can access a guild (installed with bot scope). Uses GET /guilds/{id}. */
export async function isBotInGuild(guildId: string): Promise<boolean> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
    headers: botHeaders(),
  });
  if (res.status === 404) return false;
  if (!res.ok) {
    const text = await res.text();
    console.error('isBotInGuild', guildId, res.status, text);
    return false;
  }
  return true;
}

/** Intersect user guilds with servers where the bot is installed. */
export async function filterGuildsWithBot(
  guilds: DiscordGuildSummary[],
): Promise<DiscordGuildSummary[]> {
  const results = await Promise.all(
    guilds.map(async (g) => ((await isBotInGuild(g.id)) ? g : null)),
  );
  return results.filter((g): g is DiscordGuildSummary => g !== null);
}

export function publishTargetHint(): string {
  return 'Install FORZA.EVENTS in a Discord server to publish events there.';
}

export function mapDiscordPostError(status: number, body: string): string {
  if (status === 403) {
    return 'Bot cannot post in this channel. Check channel permissions and that FORZA.EVENTS is installed in the server.';
  }
  if (status === 404) {
    return 'Channel not found. Choose another channel or reinstall FORZA.EVENTS in this server.';
  }
  if (status === 401) {
    return 'Discord bot token is invalid. Check DISCORD_BOT_TOKEN in production secrets.';
  }
  console.error('Discord post failed', status, body);
  return 'Failed to post event message to Discord.';
}
