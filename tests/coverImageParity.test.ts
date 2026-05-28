import {describe, expect, it} from 'vitest';
import {
  COVER_SOURCE_MAX_BYTES as clientBytes,
  COVER_SOURCE_MAX_MB as clientMb,
} from '../src/lib/coverImage';
import {
  COVER_SOURCE_MAX_BYTES as edgeBytes,
  COVER_SOURCE_MAX_MB as edgeMb,
} from '@edge/coverImage.ts';

describe('cover image limits client/edge parity', () => {
  it('matches', () => {
    expect(edgeBytes).toBe(clientBytes);
    expect(edgeMb).toBe(clientMb);
    expect(clientMb).toBe(20);
  });
});
