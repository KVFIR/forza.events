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
  if (permissions === undefined || permissions === '') return false;
  const p = BigInt(permissions);
  return (p & ADMINISTRATOR) === ADMINISTRATOR || (p & MANAGE_GUILD) === MANAGE_GUILD;
}

/** Fetch with one retry on Discord rate limit (429). */
export async function discordApiFetch(
  url: string,
  init?: RequestInit,
  retries = 1,
): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status !== 429 || retries <= 0) return res;
  const retryAfterSec = Math.min(
    5,
    Math.max(1, Number.parseInt(res.headers.get('Retry-After') ?? '2', 10) || 2),
  );
  await new Promise((r) => setTimeout(r, retryAfterSec * 1000));
  return discordApiFetch(url, init, retries - 1);
}

export function discordRateLimitMessage(status: number): string | null {
  if (status === 429) {
    return 'Discord rate limit — wait a few seconds and try again.';
  }
  return null;
}

export async function fetchUserGuilds(
  accessToken: string,
): Promise<DiscordGuildSummary[]> {
  const res = await discordApiFetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  if (!res.ok) {
    const rateLimited = discordRateLimitMessage(res.status);
    throw new Error(rateLimited ?? `Failed to list user guilds: ${res.status}`);
  }
  return res.json();
}

const BOT_GUILDS_TTL_MS = 60_000;
let botGuildIdsCache: {ids: Set<string>; expiresAt: number} | null = null;

/** Guild IDs where the bot is installed (one paginated list call, cached). */
export async function fetchBotGuildIds(): Promise<Set<string>> {
  const now = Date.now();
  if (botGuildIdsCache && now < botGuildIdsCache.expiresAt) {
    return botGuildIdsCache.ids;
  }

  const ids = new Set<string>();
  let before: string | undefined;
  for (;;) {
    const url = new URL('https://discord.com/api/v10/users/@me/guilds');
    url.searchParams.set('limit', '200');
    if (before) url.searchParams.set('before', before);
    const res = await discordApiFetch(url.toString(), {headers: botHeaders()});
    if (!res.ok) {
      const rateLimited = discordRateLimitMessage(res.status);
      throw new Error(rateLimited ?? `Failed to list bot guilds: ${res.status}`);
    }
    const page = (await res.json()) as {id: string}[];
    if (page.length === 0) break;
    for (const g of page) ids.add(g.id);
    if (page.length < 200) break;
    before = page[page.length - 1]!.id;
  }

  botGuildIdsCache = {ids, expiresAt: now + BOT_GUILDS_TTL_MS};
  return ids;
}

export async function botIsInGuild(guildId: string): Promise<boolean> {
  const ids = await fetchBotGuildIds();
  return ids.has(guildId);
}

/** @deprecated Prefer botIsInGuild — avoids N parallel GET /guilds/{id} calls. */
export async function isBotInGuild(guildId: string): Promise<boolean> {
  return botIsInGuild(guildId);
}

/** Intersect user guilds with servers where the bot is installed. */
export async function filterGuildsWithBot(
  guilds: DiscordGuildSummary[],
): Promise<DiscordGuildSummary[]> {
  const botIds = await fetchBotGuildIds();
  return guilds.filter((g) => botIds.has(g.id));
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
