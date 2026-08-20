#!/usr/bin/env node
/**
 * Download Fandom pageimage thumbs into public/cars/{fh5|fh6}/.
 * Missing wiki images copy public/cars/null.webp (Null Car).
 *
 * Usage: npm run data:car-thumbs [-- --force]
 */
import {createWriteStream} from 'node:fs';
import {copyFile, mkdir, readFile, stat} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import sharp from 'sharp';
import {stripYearFromModelTitle} from './catalogModelUtils.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://forza.fandom.com/api.php';
const UA = 'ForzaEventsResearch/1.0 (local; car thumbs)';
const TITLE_BATCH = 50;
const DOWNLOAD_CONCURRENCY = 6;
const THUMB_WIDTH = 320;
const force = process.argv.includes('--force');

const games = [
  {game: 'fh6', seed: 'supabase/seed/fh6cars.json', fandom: 'data/fh6_fandom_cars.json'},
  {game: 'fh5', seed: 'supabase/seed/fh5cars.json', fandom: 'data/fh5_fandom_cars.json'},
];

/** Keep in sync with src/lib/carThumb.ts */
function carTitle(car) {
  const model = String(car.model ?? '')
    .replace(/\s*\(([12][0-9]{3})\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const make = String(car.make ?? '').trim();
  if (!make || !model) return model || make;
  if (model.toLowerCase().startsWith(make.toLowerCase())) return model;
  return `${make} ${model}`;
}

function carThumbFileName(car) {
  const slug = carTitle(car)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const year =
    car.year == null || !Number.isFinite(Number(car.year))
      ? 'x'
      : String(Math.trunc(Number(car.year)));
  return `${slug}_${year}_${Math.trunc(Number(car.pi))}.webp`;
}

function parseYear(raw) {
  if (raw == null || raw === '') return null;
  const y = Number.parseInt(String(raw), 10);
  return Number.isFinite(y) ? y : null;
}

function parsePi(raw) {
  if (raw == null || raw === '') return null;
  const p = Number.parseInt(String(raw).replace(/,/g, ''), 10);
  return Number.isFinite(p) ? p : null;
}

function catalogKey(make, model, year, pi) {
  return `${make}\0${model}\0${year ?? ''}\0${pi}`;
}

async function fileOk(path) {
  try {
    const s = await stat(path);
    return s.isFile() && s.size > 100;
  } catch {
    return false;
  }
}

async function apiQuery(params) {
  const url = `${API}?${new URLSearchParams({format: 'json', ...params})}`;
  const res = await fetch(url, {headers: {'User-Agent': UA}});
  if (!res.ok) throw new Error(`wiki ${res.status} ${url}`);
  return res.json();
}

function resolveCanon(query, title) {
  const hops = new Map();
  for (const n of query.normalized ?? []) hops.set(n.from, n.to);
  for (const r of query.redirects ?? []) hops.set(r.from, r.to);
  let t = title;
  for (let i = 0; i < 6; i += 1) {
    const next = hops.get(t);
    if (!next) break;
    t = next;
  }
  return t;
}

async function pageImageUrls(titles) {
  const urls = new Map();
  for (let i = 0; i < titles.length; i += TITLE_BATCH) {
    const batch = titles.slice(i, i + TITLE_BATCH);
    const query = (
      await apiQuery({
        action: 'query',
        prop: 'pageimages',
        titles: batch.join('|'),
        pithumbsize: String(THUMB_WIDTH),
        piprop: 'thumbnail',
        redirects: '1',
      })
    ).query ?? {};
    const byTitle = new Map();
    for (const page of Object.values(query.pages ?? {})) {
      const src = page.thumbnail?.source;
      if (src && page.title) byTitle.set(page.title, src);
    }
    for (const title of batch) {
      const src = byTitle.get(resolveCanon(query, title)) ?? byTitle.get(title);
      if (src) urls.set(title, src.split('?')[0]);
    }
    process.stdout.write(`  pageimages ${Math.min(i + batch.length, titles.length)}/${titles.length}\r`);
  }
  process.stdout.write('\n');
  return urls;
}

async function downloadBuffer(url) {
  const res = await fetch(url, {headers: {'User-Agent': UA}});
  if (!res.ok) throw new Error(`thumb ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function writeWebp(dest, input) {
  const buf = await sharp(input)
    .resize(THUMB_WIDTH, null, {fit: 'inside', withoutEnlargement: true})
    .webp({quality: 80, alphaQuality: 80})
    .toBuffer();
  await pipeline(Readable.from(buf), createWriteStream(dest));
}

async function mapPool(items, limit, fn) {
  let i = 0;
  const workers = Array.from({length: Math.min(limit, items.length)}, async () => {
    while (i < items.length) {
      const idx = i;
      i += 1;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

const carsDir = join(repoRoot, 'public', 'cars');
await mkdir(carsDir, {recursive: true});
const nullPath = join(carsDir, 'null.webp');

if (force || !(await fileOk(nullPath))) {
  const nullQuery = await apiQuery({
    action: 'query',
    prop: 'pageimages',
    titles: 'Null Car',
    pithumbsize: String(THUMB_WIDTH),
    piprop: 'thumbnail',
  });
  const nullUrl = Object.values(nullQuery.query?.pages ?? {})[0]?.thumbnail?.source;
  if (!nullUrl) throw new Error('Null Car pageimage missing');
  await writeWebp(nullPath, await downloadBuffer(nullUrl.split('?')[0]));
  console.log('Wrote', nullPath);
}

let wrote = 0;
let skipped = 0;
let fallback = 0;
let failed = 0;
const buffers = new Map();

for (const {game, seed, fandom} of games) {
  const seedCars = JSON.parse(await readFile(join(repoRoot, seed), 'utf8'));
  const fandomPayload = JSON.parse(await readFile(join(repoRoot, fandom), 'utf8'));
  const fandomCars = fandomPayload.cars ?? fandomPayload;
  const wikiByKey = new Map();
  for (const row of fandomCars) {
    const make = String(row.make ?? '').trim();
    const model = stripYearFromModelTitle(String(row.catalog_model ?? '').trim());
    const year = parseYear(row.year);
    const pi = parsePi(row.pi);
    const title = String(row.wiki_title ?? '').trim();
    if (!make || !model || pi == null || !title) continue;
    const key = catalogKey(make, model, year, pi);
    if (!wikiByKey.has(key)) wikiByKey.set(key, title);
  }

  const destDir = join(carsDir, game);
  await mkdir(destDir, {recursive: true});

  const jobs = [];
  for (const car of seedCars) {
    const dest = join(destDir, carThumbFileName(car));
    const key = catalogKey(car.make, car.model, car.year, car.pi);
    const wikiTitle = wikiByKey.get(key) || carTitle(car);
    jobs.push({car, dest, wikiTitle});
  }

  const need = [];
  for (const job of jobs) {
    if (!force && (await fileOk(job.dest))) {
      skipped += 1;
      continue;
    }
    need.push(job);
  }

  const titles = [...new Set(need.map((j) => j.wikiTitle).filter((t) => t && !t.includes('|')))];
  console.log(`${game}: ${need.length} to fetch, ${titles.length} wiki titles`);
  const imageUrls = titles.length ? await pageImageUrls(titles) : new Map();

  const uniqueUrls = [...new Set([...imageUrls.values()])].filter((url) => !buffers.has(url));
  let fetched = 0;
  await mapPool(uniqueUrls, DOWNLOAD_CONCURRENCY, async (url) => {
    try {
      buffers.set(url, await downloadBuffer(url));
    } catch (err) {
      console.warn(`download failed ${url}:`, err.message);
    }
    fetched += 1;
    if (fetched % 25 === 0 || fetched === uniqueUrls.length) {
      process.stdout.write(`  download ${fetched}/${uniqueUrls.length}\r`);
    }
  });
  if (uniqueUrls.length) process.stdout.write('\n');

  for (const job of need) {
    const url = imageUrls.get(job.wikiTitle);
    const buf = url ? buffers.get(url) : null;
    try {
      if (buf) {
        await writeWebp(job.dest, buf);
        wrote += 1;
      } else {
        await copyFile(nullPath, job.dest);
        fallback += 1;
      }
    } catch (err) {
      failed += 1;
      console.warn(`write failed ${job.dest}:`, err.message);
    }
  }
}

console.log({wrote, skipped, fallback, failed});
if (failed) process.exit(1);
