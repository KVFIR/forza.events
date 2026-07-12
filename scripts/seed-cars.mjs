#!/usr/bin/env node
/**
 * Sync FH6 car catalog into Postgres without breaking event_cars links.
 *
 * - UPSERT on (make, model, year, pi) — existing UUIDs are preserved
 * - Cars removed from fh6cars.json → active = false (not deleted)
 * - Does NOT touch event_cars
 *
 * Usage:
 *   npm run seed:cars              # prefers Supabase CLI (--linked)
 *   node scripts/seed-cars.mjs     # same
 *   node scripts/seed-cars.mjs --service-role  # SUPABASE_SERVICE_ROLE_KEY + JS upsert
 *
 * Requires migration 006_cars_catalog_sync.sql applied first.
 */
import {execSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(root, '..');
const catalogPath = join(repoRoot, 'supabase/seed/fh6cars.json');

const useServiceRole = process.argv.includes('--service-role');
const cars = JSON.parse(readFileSync(catalogPath, 'utf8'));

if (!Array.isArray(cars) || cars.length === 0) {
  console.error('Empty or invalid catalog:', catalogPath);
  process.exit(1);
}

function escSql(s) {
  return String(s).replace(/'/g, "''");
}

function carSearchText(c) {
  return [c.make, c.model, c.year != null ? String(c.year) : '', String(c.pi)]
    .join(' ')
    .trim()
    .toLowerCase();
}

function catalogKey(c) {
  return `${c.make}\0${c.model}\0${c.year}\0${c.pi}`;
}

function buildSyncSql(rows) {
  const lines = [
    'BEGIN;',
    'CREATE TEMP TABLE _catalog_staging (',
    '  make text NOT NULL,',
    '  model text NOT NULL,',
    '  year integer NOT NULL,',
    '  pi integer NOT NULL,',
    '  search_text text NOT NULL',
    ') ON COMMIT DROP;',
  ];

  const batch = 150;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const vals = chunk
      .map((c) => {
        const y = c.year;
        const st = escSql(carSearchText(c));
        return `('${escSql(c.make)}', '${escSql(c.model)}', ${y}, ${c.pi}, '${st}')`;
      })
      .join(',\n  ');
    lines.push(`INSERT INTO _catalog_staging (make, model, year, pi, search_text) VALUES\n  ${vals};`);
  }

  lines.push(
    `INSERT INTO cars (make, model, year, pi, search_text, active)
SELECT make, model, year, pi, search_text, true
FROM _catalog_staging
ON CONFLICT (make, model, year, pi)
DO UPDATE SET
  search_text = EXCLUDED.search_text,
  active = true;`,
    `UPDATE cars c
SET active = false
WHERE c.active = true
  AND NOT EXISTS (
    SELECT 1 FROM _catalog_staging s
    WHERE s.make = c.make
      AND s.model = c.model
      AND s.year = c.year
      AND s.pi = c.pi
  );`,
    'COMMIT;',
  );

  return lines.join('\n\n');
}

async function syncViaServiceRole() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or run without --service-role');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const catalogSet = new Set(cars.map(catalogKey));

  const batch = 100;
  for (let i = 0; i < cars.length; i += batch) {
    const chunk = cars.slice(i, i + batch).map((c) => ({
      make: c.make,
      model: c.model,
      year: c.year,
      pi: c.pi,
      search_text: carSearchText(c),
      active: true,
    }));
    const {error} = await supabase.from('cars').upsert(chunk, {
      onConflict: 'make,model,year,pi',
    });
    if (error) {
      console.error(error);
      process.exit(1);
    }
    console.log(`Upserted ${Math.min(i + batch, cars.length)} / ${cars.length}`);
  }

  let page = 0;
  const pageSize = 500;
  let deactivated = 0;
  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const {data, error} = await supabase
      .from('cars')
      .select('id, make, model, year, pi')
      .eq('active', true)
      .range(from, to);
    if (error) {
      console.error(error);
      process.exit(1);
    }
    if (!data?.length) break;

    const staleIds = data.filter((r) => !catalogSet.has(catalogKey(r))).map((r) => r.id);
    if (staleIds.length) {
      const {error: offErr} = await supabase.from('cars').update({active: false}).in('id', staleIds);
      if (offErr) {
        console.error(offErr);
        process.exit(1);
      }
      deactivated += staleIds.length;
    }
    if (data.length < pageSize) break;
    page += 1;
  }

  console.log(`Deactivated ${deactivated} cars not in catalog`);
}

function syncViaLinkedCli() {
  const sqlPath = join(tmpdir(), 'forza-sync-cars.sql');
  writeFileSync(sqlPath, buildSyncSql(cars), 'utf8');
  console.log(`Running catalog sync SQL (${cars.length} cars) via Supabase CLI…`);
  execSync(`npx supabase db query --linked -f "${sqlPath}" -o json`, {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

async function main() {
  if (useServiceRole) {
    await syncViaServiceRole();
  } else {
    syncViaLinkedCli();
  }
  console.log(`Done: synced ${cars.length} cars from ${catalogPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
