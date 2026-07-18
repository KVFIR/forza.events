import {describe, expect, it} from 'vitest';
import {hasGamertag} from '../src/lib/gamertag';
import {collectPublishGaps} from '../src/screens/CreateEvent/publishGaps';
import {
  validateDraftFormOutcome,
  validateEventStep,
  validatePublishFormOutcome,
  validatePublishStep,
  firstFieldErrorStep,
} from '../src/screens/CreateEvent/validation';
import type {CreateEventFormValues} from '../src/screens/CreateEvent/types';

const baseValues: CreateEventFormValues = {
  title: 'Test Event',
  type: 'road',
  game: 'fh6',
  startsAtLocal: '2099-06-01T18:00',
  description: '',
  coverFile: null,
  coverPreview: null,
  coverUrl: null,
  tracks: [],
  carRuleMode: 'anything_goes',
  maxPi: 800,
  additionalCarRestrictions: '',
  eventCars: [],
  lobbyLeaderIsHost: false,
  lobbyLeaderGamertag: '',
  lobbyLeaderDiscordId: null,
  lobbyLeaderUsername: '',
  targetGuildId: 'guild-1',
  targetGuildName: 'Test Server',
  targetChannelId: 'channel-1',
};

describe('create event validation', () => {
  it('event step skips convoy leader when host is not leader', () => {
    const errors = validateEventStep(baseValues);
    expect(errors.lobbyLeaderDiscordId).toBeUndefined();
    expect(errors.lobbyLeaderGamertag).toBeUndefined();
  });

  it('publish step requires convoy leader when host is not leader', () => {
    const errors = validatePublishStep(baseValues, {hostGamertag: 'HostTag1'});
    expect(errors.lobbyLeaderDiscordId).toBeTruthy();
  });

  it('publish step requires host gamertag when host is leader', () => {
    const errors = validatePublishStep(
      {...baseValues, lobbyLeaderIsHost: true},
      {hostGamertag: ''},
    );
    expect(errors.lobbyLeaderGamertag).toBeTruthy();
  });

  it('publish form outcome returns field errors for convoy', () => {
    const outcome = validatePublishFormOutcome(baseValues, 'HostTag1');
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.fieldErrors.lobbyLeaderDiscordId).toBeTruthy();
      expect(outcome.globalError).toBeUndefined();
    }
  });

  it('draft form outcome allows missing publish server', () => {
    const outcome = validateDraftFormOutcome(
      {...baseValues, targetGuildId: '', lobbyLeaderIsHost: true},
      'HostTag1',
    );
    expect(outcome.ok).toBe(true);
  });

  it('publish form outcome allows open build without PI cap', () => {
    const outcome = validatePublishFormOutcome(
      {
        ...baseValues,
        maxPi: null,
        lobbyLeaderIsHost: true,
        lobbyLeaderGamertag: 'HostTag1',
      },
      'HostTag1',
    );
    expect(outcome.ok).toBe(true);
  });

  it('routes convoy field errors to publish step', () => {
    expect(firstFieldErrorStep({lobbyLeaderDiscordId: 'Required'})).toBe(1);
    expect(firstFieldErrorStep({title: 'Required'})).toBe(0);
  });
});

describe('collectPublishGaps', () => {
  it('includes convoy leader gap when another leader is not chosen', () => {
    const gaps = collectPublishGaps({
      guildId: 'guild-1',
      channelId: 'ch-1',
      carRuleMode: 'anything_goes',
      carCount: 0,
      lobbyLeaderIsHost: false,
      lobbyLeaderDiscordId: null,
      hostGamertag: 'HostTag1',
    });
    expect(gaps.some((g) => g.message === 'create.gapConvoyLeader')).toBe(true);
  });

  it('includes host gamertag gap when host is convoy leader without profile tag', () => {
    const gaps = collectPublishGaps({
      guildId: 'guild-1',
      channelId: 'ch-1',
      carRuleMode: 'anything_goes',
      carCount: 0,
      lobbyLeaderIsHost: true,
      lobbyLeaderDiscordId: null,
      hostGamertag: '',
    });
    expect(gaps.some((g) => g.message === 'create.gapConvoyGamertag')).toBe(true);
    expect(hasGamertag('')).toBe(false);
  });
});
