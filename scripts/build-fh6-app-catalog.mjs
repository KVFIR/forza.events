#!/usr/bin/env node
/**
 * Build app car catalog (supabase/seed/fh6cars.json) from scraped Fandom data.
 *
 * Schema matches Create Event search + seed-cars.mjs:
 *   { make, model, year, pi, class }
 *
 * - model: full display name (`vehicle` from wiki list)
 * - class: PI band via same rules as src/lib/pi.ts
 *
 * Usage: node scripts/build-fh6-app-catalog.mjs [path-to-fh6_fandom_cars.json]
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ?? join(root, '../data/fh6_fandom_cars.json');
const outJson = join(root, '../supabase/seed/fh6cars.json');

const PI_MIN = 100;
const PI_MAX = 999;

/** Keep in sync with src/lib/pi.ts piToClass() */
function piToClass(pi) {
  const p = Math.min(PI_MAX, Math.max(PI_MIN, Math.round(pi)));
  if (p === PI_MAX) return 'X';
  if (p >= 901) return 'R';
  if (p >= 801) return 'S2';
  if (p >= 701) return 'S1';
  if (p >= 601) return 'A';
  if (p >= 501) return 'B';
  if (p >= 401) return 'C';
  return 'D';
}

function parseYear(raw) {
  if (raw == null || raw === '') return null;
  const y = Number.parseInt(String(raw), 10);
  return Number.isFinite(y) ? y : null;
}

function parsePi(raw) {
  if (raw == null || raw === '') return null;
  const p = Number.parseInt(String(raw).replace(/,/g, ''), 10);
  if (!Number.isFinite(p) || p < PI_MIN || p > PI_MAX) return null;
  return p;
}

/** Keep in sync with scripts/fh6_fandom_mappings.py EDITION_LABEL */
const EDITION_LABEL = {
  wp: 'Welcome Pack',
  pass: 'Car Pass',
  wtac: 'Time Attack Car Pack',
  ita: 'Italian Passion Car Pack',
  vip: 'VIP Membership',
  preorder: 'Pre-order bonus',
  fe: 'Forza Edition',
  promo: 'Promotional',
  apromo: 'Promotional (Autoshow)',
  un: 'Unobtainable',
};

function editionLabel(unlockCode) {
  const code = String(unlockCode ?? '').trim().toLowerCase();
  if (code in EDITION_LABEL) return EDITION_LABEL[code];
  if (code.endsWith('wp') || code === 'wp') return EDITION_LABEL.wp;
  return '';
}

/** Keep in sync with scripts/fh6_fandom_normalize.py vehicle_display_title */
function vehicleDisplayTitle(car) {
  const vehicle = String(car.vehicle ?? '').trim();
  const display = String(car.display_name ?? '').trim();
  if (display && display.includes('#') && !vehicle.includes('#')) return display;
  return vehicle || display || String(car.model ?? '').trim();
}

/** Edition suffix only for duplicate vehicle names (e.g. Welcome Pack vs Autoshow). */
function catalogModelName(car, duplicateVehicles) {
  const vehicle = String(car.vehicle ?? '').trim();
  const base = vehicleDisplayTitle(car);
  if (!duplicateVehicles.has(vehicle)) return base;
  const edition = String(car.edition ?? '').trim() || editionLabel(car.unlock_code);
  if (!edition || base.toLowerCase().includes(edition.toLowerCase())) return base;
  const suffix = `'${edition}'`;
  if (base.endsWith(suffix)) return base;
  return `${base} ${suffix}`;
}

function duplicateVehiclesFrom(cars) {
  const counts = new Map();
  for (const car of cars) {
    const v = String(car.vehicle ?? '').trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([v]) => v));
}

function catalogRow(car, duplicateVehicles) {
  const pi = parsePi(car.pi);
  if (pi == null) return null;

  const make = String(car.make ?? '').trim();
  const model = catalogModelName(car, duplicateVehicles);
  if (!make || !model) return null;

  return {
    make,
    model,
    year: parseYear(car.year),
    pi,
    class: piToClass(pi),
  };
}

function dedupeKey(row) {
  return `${row.make}\0${row.model}\0${row.year ?? ''}\0${row.pi}`;
}

const payload = JSON.parse(readFileSync(inputPath, 'utf8'));
const rawCars = payload.cars ?? payload;
if (!Array.isArray(rawCars)) {
  console.error('Expected { cars: [...] } or an array');
  process.exit(1);
}

const duplicateVehicles = duplicateVehiclesFrom(rawCars);
const seen = new Set();
const cars = [];
const skipped = {noPi: 0, incomplete: 0, duplicate: 0};

for (const car of rawCars) {
  const row = catalogRow(car, duplicateVehicles);
  if (!row) {
    if (parsePi(car.pi) == null) skipped.noPi += 1;
    else skipped.incomplete += 1;
    continue;
  }
  const key = dedupeKey(row);
  if (seen.has(key)) {
    skipped.duplicate += 1;
    continue;
  }
  seen.add(key);
  cars.push(row);
}

cars.sort((a, b) => {
  const mk = a.make.localeCompare(b.make);
  if (mk !== 0) return mk;
  const md = a.model.localeCompare(b.model);
  if (md !== 0) return md;
  const ya = a.year ?? 0;
  const yb = b.year ?? 0;
  if (ya !== yb) return ya - yb;
  return a.pi - b.pi;
});

writeFileSync(outJson, JSON.stringify(cars, null, 2) + '\n');

console.log(`Wrote ${outJson} (${cars.length} cars)`);
if (skipped.noPi || skipped.incomplete || skipped.duplicate) {
  console.log('Skipped:', skipped);
}
