import {describe, expect, it} from 'vitest';
import {normalizeCarsForDiff, normalizeTracksForDiff, tracksOrCarsChanged} from '../supabase/functions/_shared/notificationDiff.ts';

describe('notificationDiff', () => {
  it('detects track name changes', () => {
    const before = {tracks: [{name: 'Laguna'}], carFingerprint: '{}'};
    const after = {tracks: [{name: 'Road Atlanta'}], carFingerprint: '{}'};
    expect(tracksOrCarsChanged(before, after)).toEqual({tracks: true, cars: false});
  });

  it('detects car rule fingerprint changes', () => {
    const fp1 = normalizeCarsForDiff('anything_goes', 800, '', []);
    const fp2 = normalizeCarsForDiff('anything_goes', 900, '', []);
    const before = {tracks: [], carFingerprint: fp1};
    const after = {tracks: [], carFingerprint: fp2};
    expect(tracksOrCarsChanged(before, after)).toEqual({tracks: false, cars: true});
  });

  it('normalizes tracks consistently', () => {
    expect(normalizeTracksForDiff([{name: ' A '}])).toBe(normalizeTracksForDiff([{name: 'A'}]));
  });
});
