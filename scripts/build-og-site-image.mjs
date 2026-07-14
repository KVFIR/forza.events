#!/usr/bin/env node
/**
 * Build the default site OG/Twitter card (1200×630 WebP).
 * Run: node scripts/build-og-site-image.mjs
 * Keep dimensions in sync with DEFAULT_OG_IMAGE_* in src/lib/pageMeta.ts.
 */
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'og');
const outPath = path.join(outDir, 'site.webp');

const WIDTH = 1200;
const HEIGHT = 630;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
    <radialGradient id="glowTop" cx="50%" cy="0%" r="70%">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowBottom" cx="95%" cy="95%" r="45%">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#06060e"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowTop)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowBottom)"/>
  <text
    x="600"
    y="285"
    text-anchor="middle"
    font-family="Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    font-size="92"
    font-weight="800"
    font-style="italic"
    letter-spacing="-2"
    fill="#ffffff"
    transform="skewX(-10 600 285)"
  >FORZA<tspan fill="url(#accent)">.EVENTS</tspan></text>
  <text
    x="600"
    y="360"
    text-anchor="middle"
    font-family="Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    font-size="34"
    font-weight="500"
    fill="#94a3b8"
  >Community events for Forza Horizon</text>
  <text
    x="600"
    y="410"
    text-anchor="middle"
    font-family="Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    font-size="28"
    font-weight="500"
    fill="#64748b"
  >Browse · Join · Host — in Discord</text>
</svg>`;

await mkdir(outDir, {recursive: true});
await sharp(Buffer.from(svg)).webp({quality: 88}).toFile(outPath);

const {width, height} = await sharp(outPath).metadata();
console.log(`Wrote ${outPath} (${width}×${height})`);
