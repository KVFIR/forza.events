#!/usr/bin/env node
/**
 * Resize default event covers in public/covers to WebP (~1200px wide).
 * Run: npm run optimize:covers
 */
import {readdir, mkdir, unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const coversDir = path.join(__dirname, '..', 'public', 'covers');
const MAX_WIDTH = 1200;
const QUALITY = 82;

const inputs = await readdir(coversDir);
const images = inputs.filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

if (images.length === 0) {
  console.log('No cover images found in public/covers');
  process.exit(0);
}

await mkdir(coversDir, {recursive: true});

for (const file of images) {
  const inputPath = path.join(coversDir, file);
  const base = file.replace(/\.[^.]+$/, '');
  const outputPath = path.join(coversDir, `${base}.webp`);

  const before = (await sharp(inputPath).toBuffer()).length;

  await sharp(inputPath)
    .resize({width: MAX_WIDTH, withoutEnlargement: true})
    .webp({quality: QUALITY})
    .toFile(outputPath);

  const after = (await sharp(outputPath).toBuffer()).length;
  console.log(`${file} → ${base}.webp (${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB)`);

  if (file !== `${base}.webp`) {
    await unlink(inputPath);
  }
}

console.log('Done. Update DEFAULT_COVER_BY_TYPE paths to .webp if not already.');
