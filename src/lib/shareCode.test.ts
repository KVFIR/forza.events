import {describe, expect, it} from 'vitest';
import {shareCodeForClipboard} from './shareCode';

describe('shareCodeForClipboard', () => {
  it('strips spaces from a complete grouped code', () => {
    expect(shareCodeForClipboard('123 456 789')).toBe('123456789');
  });

  it('strips spaces from codes inside a track line', () => {
    expect(shareCodeForClipboard('Laguna Seca · 123 456 789 — 15 laps')).toBe(
      'Laguna Seca · 123456789 — 15 laps',
    );
  });

  it('leaves incomplete groups and other text alone', () => {
    expect(shareCodeForClipboard('123 456')).toBe('123 456');
    expect(shareCodeForClipboard('no code here')).toBe('no code here');
  });
});
