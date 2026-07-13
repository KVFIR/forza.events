import {describe, expect, it} from 'vitest';
import {formatIngestFailureSummary} from '../src/lib/analytics';

describe('formatIngestFailureSummary', () => {
  it('returns null when no failures', () => {
    expect(formatIngestFailureSummary({})).toBeNull();
    expect(formatIngestFailureSummary({403: 0})).toBeNull();
  });

  it('formats failure counts', () => {
    expect(formatIngestFailureSummary({403: 2, network: 1})).toBe('2× 403, 1× network');
  });
});
