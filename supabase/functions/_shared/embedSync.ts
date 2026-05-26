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
  car_rule_mode?: EmbedEventInput['car_rule_mode'];
} & EmbedEventInput;

export async function enrichEmbedEvent(
  supabase: ReturnType<typeof adminClient>,
  event: EmbedEventInput & {guild_id?: string | null; car_rule_mode?: EmbedEventInput['car_rule_mode']},
): Promise<EmbedEventInput> {
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

  return {...event, guild_name, allowed_cars};
}

export async function syncPublishedEmbed(
  supabase: ReturnType<typeof adminClient>,
  event: PublishedEvent,
): Promise<void> {
  if (!event.channel_id || !event.discord_message_id) return;

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
    const text = await res.text();
    console.error('Discord embed sync failed', text);
  }
}
