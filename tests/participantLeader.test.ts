import {describe, expect, it} from 'vitest';
import {
  leaderFromEventRow,
  shouldPruneSystemParticipant,
} from '../supabase/functions/_shared/participantLeader.ts';

function row(
  partial: Partial<{
    discord_id: string;
    participation_source: string;
    is_convoy_leader: boolean;
  }> & {discord_id: string},
) {
  return {
    participation_source: 'host_assigned',
    is_convoy_leader: false,
    ...partial,
  };
}

describe('leaderFromEventRow', () => {
  it('uses host id when leader is the host', () => {
    expect(
      leaderFromEventRow({
        host_discord_id: 'host-1',
        lobby_leader_is_host: true,
        lobby_leader_gamertag: 'HostGT',
        lobby_leader_discord_id: null,
      }),
    ).toEqual({
      lobby_leader_discord_id: 'host-1',
      lobby_leader_is_host: true,
      lobby_leader_gamertag: 'HostGT',
    });
  });

  it('uses roster discord id for assigned leader', () => {
    expect(
      leaderFromEventRow({
        host_discord_id: 'host-1',
        lobby_leader_is_host: false,
        lobby_leader_gamertag: 'LeaderGT',
        lobby_leader_discord_id: 'leader-9',
      }),
    ).toEqual({
      lobby_leader_discord_id: 'leader-9',
      lobby_leader_is_host: false,
      lobby_leader_gamertag: 'LeaderGT',
    });
  });

  it('returns null without gamertag', () => {
    expect(
      leaderFromEventRow({
        host_discord_id: 'host-1',
        lobby_leader_is_host: true,
        lobby_leader_gamertag: '  ',
      }),
    ).toBeNull();
  });
});

describe('shouldPruneSystemParticipant (leader reassignment)', () => {
  const newLeader = 'leader-b';

  it('prunes former host-self row when host is no longer leader', () => {
    expect(
      shouldPruneSystemParticipant(
        row({discord_id: 'host-1', participation_source: 'host_self_assigned'}),
        newLeader,
      ),
    ).toBe(true);
  });

  it('prunes former host-assigned leader when reassigned to someone else', () => {
    expect(
      shouldPruneSystemParticipant(
        row({discord_id: 'leader-a', participation_source: 'host_assigned'}),
        newLeader,
      ),
    ).toBe(true);
  });

  it('keeps self_join drivers demoted from convoy leader', () => {
    expect(
      shouldPruneSystemParticipant(
        row({discord_id: 'driver-3', participation_source: 'self_join'}),
        newLeader,
      ),
    ).toBe(false);
  });

  it('keeps the new leader row even when source is host_assigned', () => {
    expect(
      shouldPruneSystemParticipant(
        row({
          discord_id: newLeader,
          participation_source: 'host_assigned',
          is_convoy_leader: true,
        }),
        newLeader,
      ),
    ).toBe(false);
  });

  it('never prunes the active convoy leader flag', () => {
    expect(
      shouldPruneSystemParticipant(
        row({
          discord_id: 'other',
          participation_source: 'host_assigned',
          is_convoy_leader: true,
        }),
        newLeader,
      ),
    ).toBe(false);
  });
});
