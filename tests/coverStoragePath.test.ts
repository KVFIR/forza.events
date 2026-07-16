import {describe, expect, it} from 'vitest';
import {coverStoragePath} from '@edge/eventCovers.ts';

describe('coverStoragePath', () => {
  it('uses guild folder when guild is set', () => {
    expect(coverStoragePath('11111111-1111-4111-8111-111111111111', 'guild-1', 'webp')).toBe(
      'guild-1/11111111-1111-4111-8111-111111111111/cover.webp',
    );
  });

  it('uses draft folder when guild is missing (nullable draft guild)', () => {
    expect(coverStoragePath('11111111-1111-4111-8111-111111111111', null, 'webp')).toBe(
      'draft/11111111-1111-4111-8111-111111111111/cover.webp',
    );
    expect(coverStoragePath('11111111-1111-4111-8111-111111111111', '  ', 'png')).toBe(
      'draft/11111111-1111-4111-8111-111111111111/cover.png',
    );
  });

  it('normalizes unsafe extensions to webp', () => {
    expect(coverStoragePath('11111111-1111-4111-8111-111111111111', 'g', 'exe')).toBe(
      'g/11111111-1111-4111-8111-111111111111/cover.webp',
    );
  });
});
