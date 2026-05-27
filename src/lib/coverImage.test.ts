import {describe, expect, it} from 'vitest';
import {
  COVER_ASPECT_RATIO,
  COVER_UPLOAD_MAX_HEIGHT,
  COVER_UPLOAD_MAX_WIDTH,
  coverCropSourceRect,
} from './coverImage';

describe('coverCropSourceRect', () => {
  it('returns full frame when aspect already matches', () => {
    expect(coverCropSourceRect(1280, 720)).toEqual({sx: 0, sy: 0, sw: 1280, sh: 720});
  });

  it('crops width when image is wider than 16:9', () => {
    const {sx, sy, sw, sh} = coverCropSourceRect(1920, 800);
    expect(sh).toBe(800);
    expect(sw).toBe(Math.round(800 * COVER_ASPECT_RATIO));
    expect(sx).toBe(Math.round((1920 - sw) / 2));
    expect(sy).toBe(0);
    expect(sw / sh).toBeCloseTo(COVER_ASPECT_RATIO, 2);
  });

  it('crops height when image is taller than 16:9', () => {
    const {sx, sy, sw, sh} = coverCropSourceRect(1200, 800);
    expect(sw).toBe(1200);
    expect(sh).toBe(Math.round(1200 / COVER_ASPECT_RATIO));
    expect(sy).toBe(Math.round((800 - sh) / 2));
    expect(sx).toBe(0);
    expect(sw / sh).toBeCloseTo(COVER_ASPECT_RATIO, 2);
  });
});

describe('cover upload dimensions', () => {
  it('uses 16:9 output size', () => {
    expect(COVER_UPLOAD_MAX_WIDTH / COVER_UPLOAD_MAX_HEIGHT).toBe(COVER_ASPECT_RATIO);
  });
});
