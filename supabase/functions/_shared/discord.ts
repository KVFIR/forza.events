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

export async function exchangeCode(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}> {
  const clientId = Deno.env.get('DISCORD_CLIENT_ID')!;
  const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET')!;
  const redirectUri = Deno.env.get('DISCORD_REDIRECT_URI') ?? '';

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
  });
  if (redirectUri) {
    body.set('redirect_uri', redirectUri);
  }

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
};

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

/** Guild IDs where the bot user is a member (app installed with bot scope). */
export async function fetchBotGuildIds(): Promise<Set<string>> {
  const res = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: botHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('Failed to list bot guilds', text);
    throw new Error('Failed to list bot guilds');
  }
  const guilds = (await res.json()) as {id: string}[];
  return new Set(guilds.map((g) => g.id));
}

export async function isBotInGuild(guildId: string): Promise<boolean> {
  const ids = await fetchBotGuildIds();
  return ids.has(guildId);
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
