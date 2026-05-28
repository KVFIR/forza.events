import {describe, expect, it, beforeEach} from 'vitest';
import {
  markRichPresencePayloadApplied,
  resetRichPresenceSession,
  shouldApplyRichPresencePayload,
} from '../src/lib/discordRichPresenceSession';

describe('discordRichPresenceSession', () => {
  beforeEach(() => {
    resetRichPresenceSession();
  });

  it('allows retry after failed setActivity until success marks payload', () => {
    const payload = {type: 5, details: 'Race'};
    expect(shouldApplyRichPresencePayload(payload)).toBe(true);

    expect(shouldApplyRichPresencePayload(payload)).toBe(true);

    markRichPresencePayloadApplied(payload);
    expect(shouldApplyRichPresencePayload(payload)).toBe(false);
  });
});
