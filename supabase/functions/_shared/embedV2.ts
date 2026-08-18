import {formatEventCarsV2Blocks} from './embedCarsV2.ts';
import {
  JOIN_EVENT_BUTTON_LABEL,
  OPEN_IN_APP_BUTTON_LABEL,
  joinEventCustomId,
} from './embedJoin.ts';
import {VIEW_RESULTS_BUTTON_LABEL, viewResultsCustomId} from './embedResults.ts';
import {formatEmbedSubtitle} from './embedSubtitle.ts';
import {resolveCoverAbsolute} from './eventCovers.ts';
import {eventDetailUrl, type EmbedEventInput} from './events.ts';
import {eventHasStarted} from './eventSpec.ts';
import {eventTypeEmbedColor} from './eventTypes.ts';
import {openEventCustomId} from './eventLaunch.ts';
import {resolveTrackRows, type EventTrackRow} from './eventTracks.ts';
import {formatShareCode} from './shareCode.ts';

export const IS_COMPONENTS_V2 = 32768;
const COMPLETED_COLOR = 0x374151;
const CANCELLED_COLOR = 0x6b7280;
const TEXT_MAX = 4000;
const THIN = '\u2009';
const DEFAULT_APP_ORIGIN = 'https://forza.events';
const DEFAULT_MAX_PLAYERS = 12;

type V2Node = Record<string, unknown>;

function siteOrigin(): string {
  return (
    (globalThis as {Deno?: {env: {get: (name: string) => string | undefined}}}).Deno?.env.get(
      'APP_ORIGIN',
    ) ?? DEFAULT_APP_ORIGIN
  );
}

function clipText(content: string): string {
  return content.length <= TEXT_MAX ? content : `${content.slice(0, TEXT_MAX - 1)}…`;
}

function titleHeading(title: string, url: string): string {
  const t = title.trim() || 'Event';
  return /[[\]]/.test(t) ? `# ${t}` : `# [${t}](${url})`;
}

function formatTrackV2(track: EventTrackRow): string {
  const name = track.name?.trim() ?? '';
  const code = track.share_code?.trim();
  const format = track.format?.trim();
  const bits: string[] = [];
  if (name) bits.push(name);
  if (code) bits.push(`\`${formatShareCode(code).replaceAll(' ', THIN)}\``);
  if (format) bits.push(format);
  return bits.join(' ');
}

function isFinalStatus(status: string): boolean {
  return status === 'completed' || status === 'cancelled' || status === 'archived';
}

function canJoinFromCard(event: EmbedEventInput): boolean {
  const status = event.status ?? 'open';
  if (isFinalStatus(status) || status === 'draft') return false;
  return !eventHasStarted({status, starts_at: event.starts_at});
}

function accentColor(event: EmbedEventInput): number {
  const status = event.status ?? 'open';
  if (status === 'cancelled') return CANCELLED_COLOR;
  if (status === 'completed' || status === 'archived') return COMPLETED_COLOR;
  return eventTypeEmbedColor(event.type);
}

function button(style: 1 | 2 | 3 | 4, label: string, customId: string): V2Node {
  return {type: 2, style, label, custom_id: customId};
}

function formatParticipants(event: EmbedEventInput): string {
  const maxPlayers = event.max_players || DEFAULT_MAX_PLAYERS;
  const groups = event.groups ?? [];
  const waitlist = event.waitlist_count ?? 0;
  const fallbackLeader = event.lobby_leader_gamertag?.trim() || 'TBD';
  const convoyLines =
    groups.length > 1
      ? groups
          .map((g) => {
            const n = `${g.count}/${maxPlayers}`;
            const leader = g.leader_gamertag?.trim() || fallbackLeader;
            return `**Convoy ${g.group_index}** ${n} ${leader}`;
          })
          .join('\n')
      : `**${groups[0]?.count ?? event.current_players}/${maxPlayers}** ${
          groups[0]?.leader_gamertag?.trim() || fallbackLeader
        }`;
  const waitlistLine =
    waitlist > 0
      ? waitlist === 1
        ? '1 racer waiting'
        : `${waitlist} racers waiting`
      : '';
  return ['👥 **Participants**', convoyLines, waitlistLine].filter(Boolean).join('\n');
}

/** Discord Components V2 event card (new publishes). */
export function buildEventMessageV2(event: EmbedEventInput): {
  flags: number;
  allowed_mentions: {parse: string[]};
  components: V2Node[];
} {
  const origin = siteOrigin();
  const id = event.id;
  const status = event.status ?? 'open';
  const canJoin = canJoinFromCard(event);
  const url = eventDetailUrl(event, origin);
  const cover = resolveCoverAbsolute(event.type, event.cover_image_url, origin);
  const unix = Math.floor(new Date(event.starts_at).getTime() / 1000);
  const tracks = resolveTrackRows(event.tracks, {
    event_share_code: event.event_share_code,
    track_codes: event.track_codes,
  });
  const trackLine = tracks.map(formatTrackV2).filter(Boolean).join('; ');
  const carBlocks = formatEventCarsV2Blocks({
    game: event.game,
    car_rule_mode: event.car_rule_mode,
    max_pi: event.max_pi,
    additional_car_restrictions: event.additional_car_restrictions,
    allowed_cars: event.allowed_cars,
  });
  const carContent = carBlocks
    ? [carBlocks.header, carBlocks.shared, carBlocks.list].filter(Boolean).join('\n')
    : null;
  const subtitle = formatEmbedSubtitle({
    status,
    startsAt: event.starts_at,
    isRanked: event.is_ranked,
    type: event.type,
    game: event.game,
  });
  const meta = [
    Number.isFinite(unix) ? `📅 <t:${unix}:F>; <t:${unix}:R>` : '',
    !isFinalStatus(status) && event.voice_channel_id?.trim()
      ? `🎙️ <#${event.voice_channel_id.trim()}>`
      : '',
    trackLine ? `🛣️ ${trackLine}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const about = event.description?.trim() ?? '';

  const joinBtn = button(3, JOIN_EVENT_BUTTON_LABEL, joinEventCustomId(id));
  const viewResultsBtn = button(2, VIEW_RESULTS_BUTTON_LABEL, viewResultsCustomId(id));
  const openBtn = button(2, OPEN_IN_APP_BUTTON_LABEL, openEventCustomId(id));
  const titleAccessory = canJoin ? joinBtn : status === 'completed' ? viewResultsBtn : null;

  const children: V2Node[] = [
    {
      type: 12,
      items: [{media: {url: cover}, description: event.title.trim() || 'Event'}],
    },
  ];
  if (titleAccessory) {
    children.push({
      type: 9,
      components: [{type: 10, content: clipText(titleHeading(event.title, url))}],
      accessory: titleAccessory,
    });
    children.push({type: 10, content: clipText(`-# ${subtitle}`)});
  } else {
    children.push({
      type: 10,
      content: clipText(`${titleHeading(event.title, url)}\n-# ${subtitle}`),
    });
  }
  if (meta) children.push({type: 10, content: clipText(meta)});
  if (about) {
    children.push({type: 14, divider: true, spacing: 1});
    children.push({type: 10, content: clipText(about)});
  }
  if (carContent) {
    children.push({type: 14, divider: true, spacing: 1});
    children.push({type: 10, content: clipText(carContent)});
  }
  children.push({type: 14, divider: true, spacing: 1});
  children.push({
    type: 9,
    components: [{type: 10, content: clipText(formatParticipants(event))}],
    accessory: openBtn,
  });

  return {
    flags: IS_COMPONENTS_V2,
    allowed_mentions: {parse: []},
    components: [
      {
        type: 17,
        accent_color: accentColor(event),
        components: children,
      },
    ],
  };
}
