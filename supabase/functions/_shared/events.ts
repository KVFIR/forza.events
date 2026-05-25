import {resolveCoverAbsolute} from './eventCovers.ts';
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
  car_class_cap?: string | null;
  event_share_code?: string | null;
  track_codes?: string[] | null;
  rules_allowed?: string[] | null;
  rules_forbidden?: string[] | null;
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
  const primary = event.event_share_code?.trim();
  const extras = event.track_codes ?? [];
  if (primary && extras.length) return `${primary} (+${extras.length} more)`;
  if (primary) return primary;
  if (extras.length) return extras.join(', ');
  return 'TBA';
}

function formatCarRules(event: DbEvent): string {
  if (event.car_rule_mode === 'anything_goes') {
    const cap = event.car_class_cap ? `Class ${event.car_class_cap}` : 'Class cap';
    const pi = event.max_pi ? ` · Max PI ${event.max_pi}` : '';
    return `Anything goes · ${cap}${pi}`;
  }
  return 'Restricted car list';
}

export function buildEventEmbed(event: DbEvent) {
  const when = new Date(event.starts_at).toISOString();
  const tz = event.timezone_hint ?? 'UTC';
  const siteOrigin = Deno.env.get('APP_ORIGIN') ?? 'https://forza.events';
  const coverUrl = resolveCoverAbsolute(event.type, event.cover_image_url, siteOrigin);

  const embed = {
    title: event.title,
    description: event.description?.slice(0, 300) ?? undefined,
    color: 0x8b5cf6,
    thumbnail: {url: coverUrl},
    fields: [
      {name: 'Type', value: event.type, inline: true},
      {name: 'Starts', value: `${when}\n(${tz})`, inline: true},
      {
        name: 'Spots',
        value: `${event.current_players}/${event.max_players}`,
        inline: true,
      },
      {name: 'Track', value: formatTrackField(event), inline: false},
      {name: 'Car rules', value: formatCarRules(event), inline: false},
      {name: 'Convoy leader', value: event.lobby_leader_gamertag, inline: true},
    ],
    footer: {text: 'FORZA.EVENTS · Open in app for full car list'},
  };

  const components = [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 1,
          label: 'Open in FORZA.EVENTS',
          custom_id: `open_event:${event.id}`,
        },
      ],
    },
  ];

  return {embeds: [embed], components};
}
