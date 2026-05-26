import {botHeaders} from './discord.ts';
import {
  buildEventEmbed,
  mapEventCarsForEmbed,
  type EmbedEventInput,
} from './events.ts';
import {normalizeGuildName} from './guildDisplay.ts';
import type {adminClient} from './supabase.ts';

type PublishedEvent = {
  id: string;
  channel_id: string | null;
  discord_message_id: string | null;
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
      .select('max_pi, tune_share_code, car_restrictions, cars(make, model, year)')
      .eq('event_id', event.id);
    allowed_cars = mapEventCarsForEmbed(eventCars ?? []);
  }

  return {...event, guild_name, allowed_cars, status: event.status};
}

export async function syncPublishedEmbed(
  supabase: ReturnType<typeof adminClient>,
  event: PublishedEvent,
): Promise<EmbedSyncResult> {
  if (!event.channel_id || !event.discord_message_id) {
    return {ok: true, skipped: true};
  }

  const enriched = await enrichEmbedEvent(supabase, event);
  const payload = buildEventEmbed(enriched);
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
