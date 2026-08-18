import {describe, expect, it} from 'vitest';
import {participantDisplayName} from './ParticipantDisplayNames';

describe('participantDisplayName', () => {
  it('shows gamertag and Discord line when signed in', () => {
    expect(participantDisplayName('XboxGT', 'disc_user')).toEqual({
      primary: 'XboxGT',
      discordLine: '@disc_user',
    });
  });

  it('hides Discord for guests and keeps the Xbox gamertag', () => {
    expect(participantDisplayName('XboxGT', 'disc_user', false)).toEqual({
      primary: 'XboxGT',
      discordLine: null,
    });
  });

  it('does not fall back to Discord for guests without a gamertag', () => {
    expect(participantDisplayName('', 'disc_user', false)).toEqual({
      primary: '—',
      discordLine: null,
    });
  });
});
