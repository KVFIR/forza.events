import {resolveCoverAbsolute} from './eventCovers.ts';

type DbEvent = {
  id: string;
  title: string;
  type: string;
  starts_at: string;
  timezone_hint?: string | null;
  max_players: number;
  current_players: number;
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

export function buildEventEmbed(event: DbEvent) {
  const tracks = event.track_codes?.length ? event.track_codes.join(', ') : 'TBA';
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
      {name: 'Track list', value: tracks, inline: false},
      {name: 'Convoy leader', value: event.lobby_leader_gamertag, inline: true},
    ],
    footer: {text: 'FORZA.EVENTS · Open for car list & tuning'},
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
