#!/usr/bin/env node
/**
 * Seed FH6 cars from supabase/seed/fh6cars.json
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';

const root = dirname(fileURLToPath(import.meta.url));
const cars = JSON.parse(readFileSync(join(root, '../supabase/seed/fh6cars.json'), 'utf8'));

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

const {error: delErr} = await supabase.from('event_cars').delete().neq('event_id', '00000000-0000-0000-0000-000000000000');
if (delErr) console.warn('event_cars cleanup:', delErr.message);

await supabase.from('cars').delete().neq('id', '00000000-0000-0000-0000-000000000000');

const batch = 100;
for (let i = 0; i < cars.length; i += batch) {
  const chunk = cars.slice(i, i + batch).map((c) => ({
    make: c.make,
    model: c.model,
    year: c.year,
    pi: c.pi,
    class: c.class,
  }));
  const {error} = await supabase.from('cars').insert(chunk);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`Inserted ${Math.min(i + batch, cars.length)} / ${cars.length}`);
}

console.log(`Done: ${cars.length} cars`);
