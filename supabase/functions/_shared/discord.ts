export type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  discriminator?: string;
};

/** Fallback `users.username` when no Discord handle is known yet (FK placeholder). */
export const PLACEHOLDER_USER_USERNAME = 'Driver';

/** Discord login handle (`user.username`), not `global_name` or server nick. */
export function discordUniqueUsername(user: DiscordUser): string {
  return user.username.trim() || 'User';
}

/** True when a stored value looks like a Discord handle, not a display name placeholder. */
export function isDiscordHandle(value: string | null | undefined): boolean {
  const v = value?.trim();
  if (!v || v === PLACEHOLDER_USER_USERNAME) return false;
  return /^[a-z0-9_.]{2,32}$/i.test(v);
}

export async function fetchDiscordUserById(userId: string): Promise<DiscordUser> {
  const res = await discordApiFetch(`https://discord.com/api/v10/users/${userId}`, {
    headers: botHeaders(),
  });
  if (res.status === 404) {
    throw new Error('Discord user not found');
  }
  if (!res.ok) {
    const rateLimited = discordRateLimitMessage(res.status);
    throw new Error(rateLimited ?? `Discord user fetch failed: ${res.status}`);
  }
  return res.json();
}

export function avatarUrl(user: DiscordUser, size = 128): string {
  if (user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`;
  }
  const disc = user.discriminator?.trim();
  if (disc && disc !== '0') {
    const n = parseInt(disc, 10);
    if (!Number.isNaN(n)) {
      return `https://cdn.discordapp.com/embed/avatars/${n % 5}.png`;
    }
  }
  try {
    const index = Number((BigInt(user.id) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  } catch {
    return 'https://cdn.discordapp.com/embed/avatars/0.png';
  }
}

export type DiscordOAuthTokens = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

/** Discord `/oauth2/token` failure. Message prefix stays `{label}: {status}` for token-exchange. */
export class DiscordOAuthRequestError extends Error {
  readonly status: number;
  constructor(label: string, status: number, body: string) {
    super(`${label}: ${status} ${body}`);
    this.name = 'DiscordOAuthRequestError';
    this.status = status;
  }
}

/**
 * Map Discord `/oauth2/token` (refresh) HTTP status to the client.
 * Only `400 invalid_grant` is a dead session; 429/5xx/`invalid_client` must not log the user out.
 */
export function clientStatusForDiscordOAuthRefresh(discordStatus: number): 401 | 503 {
  return discordStatus === 400 ? 401 : 503;
}

async function discordOAuthTokenRequest(
  body: URLSearchParams,
  failureLabel: string,
): Promise<DiscordOAuthTokens> {
  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new DiscordOAuthRequestError(failureLabel, res.status, text);
  }
  return res.json();
}

export async function exchangeCode(
  code: string,
  redirectUriOverride?: string | null,
): Promise<DiscordOAuthTokens> {
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

  return discordOAuthTokenRequest(body, 'Discord token exchange failed');
}

/** Refresh a user OAuth access token (`grant_type=refresh_token`). Discord may rotate `refresh_token`. */
export async function refreshAccessToken(refreshToken: string): Promise<DiscordOAuthTokens> {
  const clientId = Deno.env.get('DISCORD_CLIENT_ID')!;
  const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET')!;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  return discordOAuthTokenRequest(body, 'Discord token refresh failed');
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await discordApiFetch('https://discord.com/api/users/@me', {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  if (res.status === 429) {
    throw new DiscordRateLimitError();
  }
  if (!res.ok) {
    throw new Error(`Discord user fetch failed: ${res.status}`);
  }
  return res.json();
}

/** Thrown when Discord is sick (429 or 5xx) during token verification — callers return 503, not 401. */
export class DiscordRateLimitError extends Error {
  constructor() {
    super('DISCORD_RATE_LIMITED');
    this.name = 'DiscordRateLimitError';
  }
}

export function isDiscordRateLimitError(e: unknown): boolean {
  return (
    e instanceof DiscordRateLimitError ||
    (e instanceof Error && e.name === 'DiscordRateLimitError')
  );
}

/**
 * Discord user OAuth token from the Activity/browser client.
 * Only `x-discord-access-token` — never `Authorization` (that is the Supabase anon JWT).
 */
export function discordAccessTokenFrom(req: Request): string | null {
  const raw = req.headers.get('x-discord-access-token')?.trim();
  return raw || null;
}

const VERIFY_TOKEN_TTL_MS = 30_000;
const verifyTokenCache = new Map<string, {user: DiscordUser; expiresAt: number}>();

/**
 * Resolve the Discord user for an access token, with a short per-isolate cache.
 * Returns null only for genuinely invalid tokens; throws {@link DiscordRateLimitError}
 * on 429/5xx so a Discord blip is never mistaken for an expired session.
 */
export async function verifyDiscordToken(
  accessToken: string | null | undefined,
): Promise<DiscordUser | null> {
  if (!accessToken) return null;

  const now = Date.now();
  const cached = verifyTokenCache.get(accessToken);
  if (cached && now < cached.expiresAt) return cached.user;

  const res = await discordApiFetch('https://discord.com/api/users/@me', {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  if (res.status === 429 || res.status >= 500) {
    throw new DiscordRateLimitError();
  }
  if (!res.ok) {
    verifyTokenCache.delete(accessToken);
    return null;
  }
  const user = (await res.json()) as DiscordUser;
  verifyTokenCache.set(accessToken, {user, expiresAt: now + VERIFY_TOKEN_TTL_MS});
  return user;
}

export function botHeaders(): HeadersInit {
  const token = Deno.env.get('DISCORD_BOT_TOKEN');
  if (!token) throw new Error('DISCORD_BOT_TOKEN not set');
  return {Authorization: `Bot ${token}`, 'Content-Type': 'application/json'};
}

/** Bot API: whether `userId` is a member of `guildId` (bot must be in the guild). */
export async function isUserMemberOfGuild(
  guildId: string,
  userId: string,
): Promise<boolean> {
  const res = await discordApiFetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
    {headers: botHeaders()},
  );
  if (res.status === 404) return false;
  if (!res.ok) {
    const text = await res.text();
    console.error(
      JSON.stringify({
        msg: 'isUserMemberOfGuild failed',
        guildId,
        userId,
        status: res.status,
        body: text.slice(0, 200),
      }),
    );
    throw new Error(discordRateLimitMessage(res.status) ?? `Guild member lookup failed: ${res.status}`);
  }
  return true;
}

export type DiscordGuildSummary = {
  id: string;
  name: string;
  icon: string | null;
  /** Present on GET /users/@me/guilds (user OAuth token). */
  owner?: boolean;
  /** Present on GET /users/@me/guilds (user OAuth token). */
  permissions?: string;
};

export function guildIconCdnUrl(guildId: string, icon: string | null | undefined): string | null {
  const hash = icon?.trim();
  if (!hash) return null;
  const ext = hash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guildId}/${hash}.${ext}`;
}

type DiscordInvite = {code?: string; max_age?: number; temporary?: boolean};

/** Reuse a permanent channel invite or create one (bot needs Create Invite on the channel). */
export async function resolveChannelInviteUrl(channelId: string): Promise<string | null> {
  const listRes = await discordApiFetch(
    `https://discord.com/api/v10/channels/${channelId}/invites`,
    {headers: botHeaders()},
  );
  if (listRes.ok) {
    const invites = (await listRes.json()) as DiscordInvite[];
    const existing = invites.find(
      (i) => i.code && !i.temporary && (i.max_age === 0 || i.max_age == null),
    );
    if (existing?.code) return `https://discord.gg/${existing.code}`;
  }

  const createRes = await discordApiFetch(
    `https://discord.com/api/v10/channels/${channelId}/invites`,
    {
      method: 'POST',
      headers: botHeaders(),
      body: JSON.stringify({max_age: 0, max_uses: 0}),
    },
  );
  if (!createRes.ok) {
    const text = await createRes.text();
    console.warn(
      JSON.stringify({
        msg: 'resolveChannelInviteUrl failed',
        channel_id: channelId,
        status: createRes.status,
        body: text.slice(0, 200),
      }),
    );
    return null;
  }
  const created = (await createRes.json()) as DiscordInvite;
  return created.code ? `https://discord.gg/${created.code}` : null;
}

const MANAGE_GUILD = 0x20n;
const ADMINISTRATOR = 0x8n;

export function userCanManageGuild(
  permissions: string | undefined,
  owner?: boolean,
): boolean {
  if (owner) return true;
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
export async function fetchBotGuildIds(options?: {fresh?: boolean}): Promise<Set<string>> {
  const now = Date.now();
  if (!options?.fresh && botGuildIdsCache && now < botGuildIdsCache.expiresAt) {
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
  options?: {fresh?: boolean},
): Promise<DiscordGuildSummary[]> {
  const botIds = await fetchBotGuildIds(options);
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

export type DiscordChannelMessageResult =
  | {ok: true; id: string}
  | {ok: false; status: number; body: string};

export async function postChannelMessage(
  channelId: string,
  payload: unknown,
): Promise<DiscordChannelMessageResult> {
  const res = await fetch(`https://discord.com/api/channels/${channelId}/messages`, {
    method: 'POST',
    headers: botHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    return {ok: false, status: res.status, body: text};
  }
  const message = (await res.json()) as {id: string};
  return {ok: true, id: message.id};
}

/** Best-effort rollback when DB finalize fails after a Discord post. */
export async function deleteChannelMessage(
  channelId: string,
  messageId: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://discord.com/api/channels/${channelId}/messages/${messageId}`,
      {method: 'DELETE', headers: botHeaders()},
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(
        JSON.stringify({
          msg: 'deleteChannelMessage failed',
          channelId,
          messageId,
          status: res.status,
          body: text.slice(0, 200),
        }),
      );
      return false;
    }
    return true;
  } catch (e) {
    console.error(
      JSON.stringify({
        msg: 'deleteChannelMessage error',
        channelId,
        messageId,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return false;
  }
}
