#!/usr/bin/env node
/**
 * Seed sample events with curated, era-matched car lists.
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Re-runnable: removes events whose slug starts with "sample-".
 */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';

const root = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(root, '../supabase/seed/sample-events.json'), 'utf8'));

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function findCar({make, year, model_like}) {
  const {data, error} = await supabase
    .from('cars')
    .select('id, make, model, year, pi, class')
    .eq('make', make)
    .eq('year', year)
    .eq('active', true)
    .ilike('model', model_like)
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

async function main() {
  await supabase.from('discord_guilds').upsert(
    {guild_id: seed.guild_id, guild_name: seed.guild_name},
    {onConflict: 'guild_id'},
  );

  await supabase.from('users').upsert(
    {
      discord_id: seed.host_discord_id,
      username: seed.host_username,
      discriminator: '0',
      xbox_gamertag: 'FORZA.EVENTS',
    },
    {onConflict: 'discord_id'},
  );

  const {data: existing} = await supabase.from('events').select('id').like('slug', 'sample-%');
  const ids = (existing ?? []).map((r) => r.id);
  if (ids.length) {
    await supabase.from('event_cars').delete().in('event_id', ids);
    await supabase.from('events').delete().in('id', ids);
    console.log(`Removed ${ids.length} previous sample event(s).`);
  }

  for (const ev of seed.events) {
    const startsAt = new Date(Date.now() + ev.starts_in_hours * 60 * 60 * 1000).toISOString();

    const row = {
      slug: ev.slug,
      title: ev.title,
      type: ev.type,
      status: 'open',
      host_discord_id: seed.host_discord_id,
      guild_id: seed.guild_id,
      starts_at: startsAt,
      max_pi: ev.max_pi,
      car_rule_mode: ev.car_rule_mode,
      car_setup_mode: 'general',
      voice_policy: 'optional',
      max_players: 11,
      current_players: ev.current_players ?? 0,
      description: ev.description ?? null,
      event_share_code: ev.event_share_code,
      track_codes: ev.track_codes ?? [],
      additional_car_restrictions: ev.additional_car_restrictions ?? null,
      lobby_leader_gamertag: 'FORZA.EVENTS',
      lobby_leader_is_host: true,
      timezone_hint: 'UTC',
      region: 'global',
    };

    const {data: inserted, error: evErr} = await supabase
      .from('events')
      .insert(row)
      .select('id, slug')
      .single();

    if (evErr) {
      console.error(`Event ${ev.slug}:`, evErr.message);
      continue;
    }

    const carRows = [];
    for (const spec of ev.cars ?? []) {
      const car = await findCar(spec);
      if (!car) {
        console.warn(`  Missing car: ${spec.year} ${spec.make} ${spec.model_like}`);
        continue;
      }
      carRows.push({
        event_id: inserted.id,
        car_id: car.id,
        max_pi: spec.max_pi ?? ev.max_pi,
        car_restrictions: spec.restrictions ?? [],
      });
      console.log(`  + ${car.year} ${car.make} ${car.model} (${car.class} PI ${car.pi})`);
    }

    if (carRows.length) {
      const {error: ecErr} = await supabase.from('event_cars').insert(carRows);
      if (ecErr) console.error(`  event_cars:`, ecErr.message);
    }

    console.log(`OK ${ev.slug} (${carRows.length} cars, ${ev.car_rule_mode})`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
