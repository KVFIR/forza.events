import {describe, expect, it} from 'vitest';
import {
  formatTrackDisplayLine,
  migrateLegacyTracks,
  normalizeTracks,
  parseTracksFromRow,
  validateTracks,
} from './eventTracks';
import {VALIDATION_CODES} from './validationCodes';

describe('normalizeTracks', () => {
  it('drops empty rows and trims fields', () => {
    expect(
      normalizeTracks([
        {name: '  Laguna  ', shareCode: '123456789', format: ' 15 laps '},
        {name: '', shareCode: null, format: null},
      ]),
    ).toEqual([{name: 'Laguna', shareCode: '123 456 789', format: '15 laps'}]);
  });
});

describe('parseTracksFromRow', () => {
  it('reads jsonb tracks', () => {
    expect(
      parseTracksFromRow([
        {name: 'Route A', share_code: '111 222 333', format: '30 min'},
      ]),
    ).toEqual([{name: 'Route A', shareCode: '111 222 333', format: '30 min'}]);
  });

  it('falls back to legacy share codes', () => {
    expect(
      parseTracksFromRow([], {
        event_share_code: '842 193 405',
        track_codes: ['291 044 118'],
      }),
    ).toHaveLength(2);
  });
});

describe('migrateLegacyTracks', () => {
  it('maps codes without names', () => {
    const rows = migrateLegacyTracks({event_share_code: '123 456 789', track_codes: []});
    expect(rows[0].shareCode).toBe('123 456 789');
    expect(rows[0].name).toBe('');
  });
});

describe('formatTrackDisplayLine', () => {
  it('joins name, code, and format', () => {
    expect(
      formatTrackDisplayLine({
        name: 'Laguna Seca',
        shareCode: '123 456 789',
        format: '15 laps',
      }),
    ).toBe('Laguna Seca · 123 456 789 — 15 laps');
  });
});

describe('validateTracks', () => {
  it('requires a name for saved tracks', () => {
    expect(
      validateTracks([{name: '', shareCode: '123 456 789', format: null}]),
    ).toBe(VALIDATION_CODES.TRACK_NAME_REQUIRED);
  });
});
