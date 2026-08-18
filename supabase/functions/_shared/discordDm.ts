import {botHeaders, discordApiFetch} from './discord.ts';
import {eventDetailUrl} from './events.ts';
import {openEventCustomId} from './eventLaunch.ts';
import {openInAppButtonLabel, openInBrowserButtonLabel} from './notificationCopy.ts';

const DEFAULT_APP_ORIGIN = 'https://forza.events';

function resolveAppOrigin(): string {
  return (
    (globalThis as {Deno?: {env: {get: (name: string) => string | undefined}}}).Deno?.env.get(
      'APP_ORIGIN',
    ) ?? DEFAULT_APP_ORIGIN
  );
}

export type DmEmbed = {
  title: string;
  description: string;
  fields?: {name: string; value: string}[];
};

export type DmSendResult =
  | {ok: true}
  | {ok: false; status: number; detail: string; skipRetry?: boolean};

const dmChannelCache = new Map<string, string>();

export async function getOrCreateDmChannel(recipientDiscordId: string): Promise<string | null> {
  const cached = dmChannelCache.get(recipientDiscordId);
  if (cached) return cached;

  const res = await discordApiFetch('https://discord.com/api/v10/users/@me/channels', {
    method: 'POST',
    headers: botHeaders(),
    body: JSON.stringify({recipient_id: recipientDiscordId}),
  });
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as {id: string};
  dmChannelCache.set(recipientDiscordId, data.id);
  return data.id;
}

export type DmEventRef = {
  id: string;
  urlKey: string;
};

export function buildDmEventComponents(
  event: DmEventRef,
  origin: string,
  locale?: string | null,
): Array<{type: number; components: Array<Record<string, unknown>>}> {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 1,
          label: openInAppButtonLabel(locale).slice(0, 80),
          custom_id: openEventCustomId(event.id),
        },
        {
          type: 2,
          style: 5,
          label: openInBrowserButtonLabel(locale).slice(0, 80),
          url: eventDetailUrl(event.urlKey, origin),
        },
      ],
    },
  ];
}

export async function sendUserDm(
  recipientDiscordId: string,
  event: DmEventRef,
  embed: DmEmbed,
  locale?: string | null,
): Promise<DmSendResult> {
  const channelId = await getOrCreateDmChannel(recipientDiscordId);
  if (!channelId) {
    return {ok: false, status: 403, detail: 'Cannot open DM channel', skipRetry: true};
  }

  const payload = {
    embeds: [
      {
        title: embed.title.slice(0, 256),
        description: embed.description.slice(0, 4096),
        fields: embed.fields?.map((f) => ({
          name: f.name.slice(0, 256),
          value: f.value.slice(0, 1024),
        })),
      },
    ],
    components: buildDmEventComponents(event, resolveAppOrigin(), locale),
  };

  const res = await discordApiFetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {method: 'POST', headers: botHeaders(), body: JSON.stringify(payload)},
  );

  if (!res.ok) {
    const text = await res.text();
    const skipRetry = res.status === 403 || res.status === 404;
    return {ok: false, status: res.status, detail: text.slice(0, 200), skipRetry};
  }
  return {ok: true};
}
