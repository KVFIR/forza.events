import {resolveCoverAbsolute} from './eventCovers.ts';
import {openEventCustomId} from './eventLaunch.ts';
import {eventTypeEmbedColor, eventTypeLabel} from './eventTypes.ts';
import type {CarRuleMode} from './eventSpec.ts';

type DbEvent = {
  id: string;
  title: string;
  type: string;
  starts_at: string;
  timezone_hint?: string | null;
  max_players: number;
  current_players: number;
  max_pi?: number | null;
  car_rule_mode?: CarRuleMode | null;
  event_share_code?: string | null;
  track_codes?: string[] | null;
  rules_allowed?: string[] | null;
  rules_forbidden?: string[] | null;
  additional_car_restrictions?: string | null;
  lobby_leader_gamertag: string;
  cover_image_url?: string | null;
  description?: string | null;
};

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${base}-${date}`;
}

function formatTrackField(event: DbEvent): string {
  const codes = [event.event_share_code, ...(event.track_codes ?? [])].filter(
    (code): code is string => Boolean(code?.trim()),
  );
  if (codes.length === 0) return 'TBA';
  if (codes.length === 1) return codes[0];
  return `${codes[0]} (+${codes.length - 1} more)`;
}

function formatEmbedStart(iso: string, timezoneHint: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezoneHint,
      timeZoneName: 'short',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toISOString();
  }
}

function formatCarRules(event: DbEvent): string {
  if (event.car_rule_mode === 'anything_goes') {
    const pi = event.max_pi ? `Max PI ${event.max_pi}` : 'PI cap';
    const extra =
      event.additional_car_restrictions ??
      (event.rules_allowed ?? []).find((rule) => rule.startsWith('additional:'))?.slice('additional:'.length);
    const note = extra ? ` · ${extra}` : '';
    return `Open build · ${pi}${note}`;
  }
  return 'Restricted car list';
}

export function buildEventEmbed(event: DbEvent) {
  const tz = event.timezone_hint ?? 'UTC';
  const whenLabel = formatEmbedStart(event.starts_at, tz);
  const siteOrigin =
    (globalThis as {Deno?: {env: {get: (name: string) => string | undefined}}}).Deno?.env.get(
      'APP_ORIGIN',
    ) ?? 'https://forza.events';
  const coverUrl = resolveCoverAbsolute(event.type, event.cover_image_url, siteOrigin);

  const embed = {
    title: event.title,
    description: event.description?.slice(0, 300) ?? undefined,
    color: eventTypeEmbedColor(event.type),
    image: {url: coverUrl},
    fields: [
      {name: 'Type', value: eventTypeLabel(event.type), inline: true},
      {name: 'Starts', value: whenLabel, inline: true},
      {
        name: 'Spots',
        value: `${event.current_players}/${event.max_players}`,
        inline: true,
      },
      {name: 'Track', value: formatTrackField(event), inline: false},
      {name: 'Car rules', value: formatCarRules(event), inline: false},
      {name: 'Convoy leader', value: event.lobby_leader_gamertag, inline: true},
    ],
    footer: {text: 'FORZA.EVENTS · Tap the button to open this event'},
  };

  const components = [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 1,
          label: 'Open event',
          custom_id: openEventCustomId(event.id),
        },
      ],
    },
  ];

  return {embeds: [embed], components};
}
