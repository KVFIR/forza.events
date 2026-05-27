#!/usr/bin/env node
/**
 * Resize default event covers in public/covers to 16:9 WebP (1280×720).
 * Keep in sync with COVER_UPLOAD_* in src/lib/coverImage.ts.
 * Run: npm run optimize:covers
 */
import {readdir, mkdir, unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const coversDir = path.join(__dirname, '..', 'public', 'covers');
const OUTPUT_WIDTH = 1280;
const OUTPUT_HEIGHT = 720;
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
  const tempPath = path.join(coversDir, `${base}.optimized.webp`);

  await sharp(inputPath)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {fit: 'cover', position: 'centre'})
    .webp({quality: QUALITY})
    .toFile(tempPath);

  const after = (await sharp(tempPath).toBuffer()).length;
  await unlink(outputPath).catch(() => {});
  const {rename} = await import('node:fs/promises');
  await rename(tempPath, outputPath);
  console.log(
    `${file} → ${base}.webp ${OUTPUT_WIDTH}×${OUTPUT_HEIGHT} (${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB)`,
  );

  if (file !== `${base}.webp`) {
    await unlink(inputPath);
  }
}

console.log('Done. Update DEFAULT_COVER_BY_TYPE paths to .webp if not already.');
