import {describe, expect, it} from 'vitest';
import {viewerParticipantRealtimeFilter} from '../src/hooks/useEventLiveUpdates';

describe('viewerParticipantRealtimeFilter', () => {
  it('scopes realtime to the signed-in viewer', () => {
    expect(viewerParticipantRealtimeFilter('123456789')).toBe('discord_id=eq.123456789');
  });
});
