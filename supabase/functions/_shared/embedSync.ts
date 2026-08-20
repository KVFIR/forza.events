import {botHeaders} from './discord.ts';
import {
  buildEventEmbed,
  mapEventCarsForEmbed,
  type EmbedEventInput,
  type EmbedGroupSummary,
} from './events.ts';
import {buildEventMessageV2} from './embedV2.ts';
import {normalizeGuildName} from './guildDisplay.ts';
import type {adminClient} from './supabase.ts';

declare const EdgeRuntime: {waitUntil: (promise: Promise<unknown>) => void} | undefined;

type EmbedParticipantRow = {
  group_index: number | null;
  waitlisted: boolean | null;
  is_convoy_leader: boolean | null;
  gamertag_snapshot: string | null;
};

/** Summarize active groups (leader + count) and the waitlist size for the embed. */
export function summarizeEmbedGroups(
  rows: EmbedParticipantRow[],
  groupCount: number,
): {groups: EmbedGroupSummary[]; waitlist_count: number} {
  let waitlist_count = 0;
  const counts = new Map<number, number>();
  const leaders = new Map<number, string>();
  for (const r of rows) {
    if (r.waitlisted) {
      waitlist_count += 1;
      continue;
    }
    const g = r.group_index ?? 1;
    counts.set(g, (counts.get(g) ?? 0) + 1);
    if (r.is_convoy_leader && r.gamertag_snapshot?.trim()) {
      leaders.set(g, r.gamertag_snapshot.trim());
    }
  }
  const groups: EmbedGroupSummary[] = [];
  for (let g = 1; g <= Math.max(1, groupCount); g++) {
    groups.push({group_index: g, leader_gamertag: leaders.get(g) ?? null, count: counts.get(g) ?? 0});
  }
  return {groups, waitlist_count};
}

type PublishedEvent = {
  id: string;
  channel_id: string | null;
  discord_message_id: string | null;
  discord_components_v2?: boolean | null;
  guild_id?: string | null;
  status?: string;
  car_rule_mode?: EmbedEventInput['car_rule_mode'];
} & EmbedEventInput;

export type EmbedSyncResult =
  | {ok: true; skipped?: boolean}
  | {ok: false; eventId: string; status: number; detail: string};

export async function enrichEmbedEvent(
  supabase: ReturnType<typeof adminClient>,
  event: EmbedEventInput & {
    guild_id?: string | null;
    car_rule_mode?: EmbedEventInput['car_rule_mode'];
    status?: string;
  },
): Promise<EmbedEventInput & {status?: string}> {
  let guild_name: string | null = event.guild_name ?? null;
  if (!guild_name && event.guild_id) {
    const {data: guild} = await supabase
      .from('discord_guilds')
      .select('guild_name')
      .eq('guild_id', event.guild_id)
      .maybeSingle();
    guild_name = normalizeGuildName(guild?.guild_name) ?? null;
  }

  let allowed_cars = event.allowed_cars;
  if (event.car_rule_mode === 'restricted_list' && !allowed_cars?.length) {
    const {data: eventCars} = await supabase
      .from('event_cars')
      .select('max_pi, sort_order, tune_share_code, car_restrictions, cars(make, model, year, abbreviation)')
      .eq('event_id', event.id)
      .order('sort_order');
    allowed_cars = mapEventCarsForEmbed(eventCars ?? []);
  }

  const {data: parts} = await supabase
    .from('event_participants')
    .select('group_index, waitlisted, is_convoy_leader, gamertag_snapshot')
    .eq('event_id', event.id);
  const {groups, waitlist_count} = summarizeEmbedGroups(parts ?? [], event.group_count ?? 1);

  return {...event, guild_name, allowed_cars, groups, waitlist_count, status: event.status};
}

export async function syncPublishedEmbed(
  supabase: ReturnType<typeof adminClient>,
  event: PublishedEvent,
): Promise<EmbedSyncResult> {
  if (!event.channel_id || !event.discord_message_id) {
    return {ok: true, skipped: true};
  }

  const enriched = await enrichEmbedEvent(supabase, event);
  const payload = event.discord_components_v2
    ? buildEventMessageV2(enriched)
    : buildEventEmbed(enriched);
  const res = await fetch(
    `https://discord.com/api/channels/${event.channel_id}/messages/${event.discord_message_id}`,
    {
      method: 'PATCH',
      headers: botHeaders(),
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    console.error(
      JSON.stringify({
        msg: 'Discord embed sync failed',
        eventId: event.id,
        channelId: event.channel_id,
        messageId: event.discord_message_id,
        status: res.status,
        detail: detail.slice(0, 500),
      }),
    );
    return {ok: false, eventId: event.id, status: res.status, detail};
  }

  return {ok: true};
}

/** Load event row and PATCH the published Discord message (join/leave, cancel, results). */
export async function syncPublishedEmbedByEventId(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
): Promise<EmbedSyncResult> {
  const {data: event, error} = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    console.error(
      JSON.stringify({msg: 'embed sync load failed', eventId, detail: error.message}),
    );
    return {ok: false, eventId, status: 500, detail: error.message};
  }

  if (!event) {
    return {ok: false, eventId, status: 404, detail: 'Event not found'};
  }

  return syncPublishedEmbed(supabase, event);
}

/** Background PATCH so interaction replies stay inside Discord's 3s window. */
export function deferSyncPublishedEmbedByEventId(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
): void {
  const work = async () => {
    const result = await syncPublishedEmbedByEventId(supabase, eventId);
    if (!result.ok) {
      console.error(
        JSON.stringify({
          msg: 'Joined event but Discord embed sync failed',
          eventId,
          status: result.status,
        }),
      );
    }
  };
  if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
    EdgeRuntime.waitUntil(work());
  } else {
    void work();
  }
}
