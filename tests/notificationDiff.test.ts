import {describe, expect, it} from 'vitest';
import {normalizeCarsForDiff, normalizeTracksForDiff, eventUpdateContentHash, scheduleChanged, tracksOrCarsChanged} from '../supabase/functions/_shared/notificationDiff.ts';

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

  it('fingerprints duplicate catalog cars with different tunes separately', () => {
    const one = normalizeCarsForDiff('restricted_list', null, '', [
      {car_id: 'car-1', max_pi: 800, tune_share_code: '111 111 111', car_restrictions: []},
    ]);
    const twoBuilds = normalizeCarsForDiff('restricted_list', null, '', [
      {car_id: 'car-1', max_pi: 800, tune_share_code: '111 111 111', car_restrictions: []},
      {car_id: 'car-1', max_pi: 900, tune_share_code: '222 222 222', car_restrictions: ['No engine swap']},
    ]);
    expect(one).not.toBe(twoBuilds);
    const reordered = normalizeCarsForDiff('restricted_list', null, '', [
      {car_id: 'car-1', max_pi: 900, tune_share_code: '222 222 222', car_restrictions: ['No engine swap']},
      {car_id: 'car-1', max_pi: 800, tune_share_code: '111 111 111', car_restrictions: []},
    ]);
    expect(reordered).toBe(twoBuilds);
  });

  it('normalizes tracks consistently', () => {
    expect(normalizeTracksForDiff([{name: ' A '}])).toBe(normalizeTracksForDiff([{name: 'A'}]));
  });

  it('detects schedule changes by instant', () => {
    expect(scheduleChanged('2030-01-01T12:00:00.000Z', '2030-01-01T13:00:00.000Z')).toBe(true);
    expect(scheduleChanged('2030-01-01T12:00:00.000Z', '2030-01-01T12:00:00.000Z')).toBe(false);
  });

  it('ignores sub-minute drift', () => {
    expect(scheduleChanged('2030-01-01T12:00:30.000Z', '2030-01-01T12:00:00.000Z')).toBe(false);
  });

  it('includes schedule in content hash', () => {
    const withSchedule = eventUpdateContentHash(false, false, true, [], '{}', '2030-01-01T12:00:00.000Z');
    const without = eventUpdateContentHash(false, false, false, [], '{}', '2030-01-01T12:00:00.000Z');
    expect(withSchedule).not.toBe(without);
  });
});
